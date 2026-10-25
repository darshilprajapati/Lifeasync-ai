using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input;
using LifeSyncAI.Core.Helpers;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Options;
using LifeSyncAI.Core.Services;
using Xunit;

namespace LifeSyncAI.Tests
{
    public class SupabaseAvatarStorageTests
    {
        // Sample valid binary headers for testing
        private static byte[] CreateValidJpegBytes(int totalLength = 100)
        {
            var bytes = new byte[totalLength];
            bytes[0] = 0xFF;
            bytes[1] = 0xD8;
            bytes[2] = 0xFF;
            bytes[3] = 0xE0;
            return bytes;
        }

        private static byte[] CreateValidPngBytes(int totalLength = 100)
        {
            var bytes = new byte[totalLength];
            byte[] header = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
            Array.Copy(header, bytes, header.Length);
            return bytes;
        }

        private static byte[] CreateValidWebpBytes(int totalLength = 100)
        {
            var bytes = new byte[totalLength];
            byte[] riff = { 0x52, 0x49, 0x46, 0x46 }; // "RIFF"
            byte[] webp = { 0x57, 0x45, 0x42, 0x50 }; // "WEBP"
            Array.Copy(riff, 0, bytes, 0, 4);
            Array.Copy(webp, 0, bytes, 8, 4);
            return bytes;
        }

        private class MockHttpMessageHandler : HttpMessageHandler
        {
            public HttpRequestMessage? LastRequest { get; private set; }
            public HttpStatusCode ResponseStatus { get; set; } = HttpStatusCode.OK;
            public string ResponseContent { get; set; } = "{\"Key\":\"avatars/test/avatar.webp\"}";

            protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                LastRequest = request;
                var response = new HttpResponseMessage(ResponseStatus)
                {
                    Content = new StringContent(ResponseContent, Encoding.UTF8, "application/json")
                };
                return Task.FromResult(response);
            }
        }

        private (ApplicationDbContext Context, SqliteConnection Connection) CreateInMemoryDbContext()
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            connection.Open();
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(connection)
                .Options;
            var context = new ApplicationDbContext(options);
            context.Database.EnsureCreated();
            return (context, connection);
        }

        // ==========================================
        // 1. IMAGE FILE VALIDATOR TESTS
        // ==========================================

        [Fact]
        public async Task Validator_AcceptsValidJpeg_WithJpgAndJpegExtension()
        {
            var bytes = CreateValidJpegBytes();
            using var stream1 = new MemoryStream(bytes);
            var res1 = await ImageFileValidator.ValidateImageStreamAsync(stream1, "myphoto.jpg", "image/jpeg");
            Assert.True(res1.IsValid);
            Assert.Equal(".jpg", res1.NormalizedExtension);
            Assert.Equal("image/jpeg", res1.CanonicalMimeType);

            using var stream2 = new MemoryStream(bytes);
            var res2 = await ImageFileValidator.ValidateImageStreamAsync(stream2, "myphoto.jpeg", "image/jpeg");
            Assert.True(res2.IsValid);
            Assert.Equal(".jpg", res2.NormalizedExtension);
        }

        [Fact]
        public async Task Validator_AcceptsValidPng()
        {
            var bytes = CreateValidPngBytes();
            using var stream = new MemoryStream(bytes);
            var res = await ImageFileValidator.ValidateImageStreamAsync(stream, "avatar.png", "image/png");
            Assert.True(res.IsValid);
            Assert.Equal(".png", res.NormalizedExtension);
            Assert.Equal("image/png", res.CanonicalMimeType);
        }

        [Fact]
        public async Task Validator_AcceptsValidWebp()
        {
            var bytes = CreateValidWebpBytes();
            using var stream = new MemoryStream(bytes);
            var res = await ImageFileValidator.ValidateImageStreamAsync(stream, "profile.webp", "image/webp");
            Assert.True(res.IsValid);
            Assert.Equal(".webp", res.NormalizedExtension);
            Assert.Equal("image/webp", res.CanonicalMimeType);
        }

        [Fact]
        public async Task Validator_RejectsEmptyFile()
        {
            using var stream = new MemoryStream(Array.Empty<byte>());
            var res = await ImageFileValidator.ValidateImageStreamAsync(stream, "empty.png", "image/png");
            Assert.False(res.IsValid);
            Assert.Contains("empty", res.ErrorMessage, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Validator_RejectsOversizedFile_Exceeding5MB()
        {
            // 5 MB + 1 byte
            var bytes = CreateValidPngBytes((5 * 1024 * 1024) + 1);
            using var stream = new MemoryStream(bytes);
            var res = await ImageFileValidator.ValidateImageStreamAsync(stream, "huge.png", "image/png");
            Assert.False(res.IsValid);
            Assert.Contains("5 MB", res.ErrorMessage);
        }

        [Fact]
        public async Task Validator_RejectsDisallowedExtensions()
        {
            var bytes = CreateValidPngBytes();
            using var stream1 = new MemoryStream(bytes);
            var res1 = await ImageFileValidator.ValidateImageStreamAsync(stream1, "malicious.exe", "image/png");
            Assert.False(res1.IsValid);
            Assert.Contains("Unsupported file extension", res1.ErrorMessage);

            using var stream2 = new MemoryStream(bytes);
            var res2 = await ImageFileValidator.ValidateImageStreamAsync(stream2, "graphic.gif", "image/gif");
            Assert.False(res2.IsValid);
            Assert.Contains("Unsupported file extension", res2.ErrorMessage);
        }

        [Fact]
        public async Task Validator_RejectsMismatchedExtensionAndMagicBytes()
        {
            // File is actually a PNG but renamed to .jpg
            var bytes = CreateValidPngBytes();
            using var stream = new MemoryStream(bytes);
            var res = await ImageFileValidator.ValidateImageStreamAsync(stream, "faked.jpg", "image/jpeg");
            Assert.False(res.IsValid);
            Assert.Contains("does not match", res.ErrorMessage, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Validator_RejectsArbitraryBinaryOrCorruptedContent()
        {
            var textBytes = Encoding.UTF8.GetBytes("This is plain text pretending to be an avatar image.");
            using var stream = new MemoryStream(textBytes);
            var res = await ImageFileValidator.ValidateImageStreamAsync(stream, "fake.webp", "image/webp");
            Assert.False(res.IsValid);
            Assert.Contains("signature is invalid", res.ErrorMessage);
        }

        // ==========================================
        // 2. SUPABASE STORAGE SERVICE & CONFIGURATION TESTS
        // ==========================================

        [Fact]
        public void Configuration_MapsDoubleUnderscoreEnvironmentVariables_ToSupabaseOptions()
        {
            // Simulate ASP.NET Core environment variable loading: Supabase__Url -> Supabase:Url
            var envDictionary = new System.Collections.Generic.Dictionary<string, string?>
            {
                { "Supabase:Url", "https://iklnzebhdonlgbpvmgut.supabase.co" },
                { "Supabase:ServiceRoleKey", "simulated-service-role-key-test" },
                { "Supabase:AvatarBucket", "avatars" }
            };

            var configuration = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
                .AddInMemoryCollection(envDictionary)
                .Build();

            var options = configuration.GetSection(SupabaseOptions.SectionName).Get<SupabaseOptions>();

            Assert.NotNull(options);
            Assert.Equal("https://iklnzebhdonlgbpvmgut.supabase.co", options.Url);
            Assert.Equal("simulated-service-role-key-test", options.ServiceRoleKey);
            Assert.Equal("avatars", options.AvatarBucket);
            Assert.True(options.IsConfigured);
        }

        [Fact]
        public async Task SupabaseService_ThrowsClearError_WhenNotConfigured()
        {
            var options = Options.Create(new SupabaseOptions
            {
                Url = "",
                ServiceRoleKey = "",
                AvatarBucket = "avatars"
            });
            var handler = new MockHttpMessageHandler();
            var httpClient = new HttpClient(handler);
            var service = new SupabaseStorageService(httpClient, options, NullLogger<SupabaseStorageService>.Instance);

            Assert.False(service.IsConfigured);

            var bytes = CreateValidPngBytes();
            using var stream = new MemoryStream(bytes);

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.UploadAvatarAsync(1, stream, "test.png", "image/png")
            );

            Assert.Contains("Supabase Storage is not configured", ex.Message);
            Assert.DoesNotContain("secret", ex.Message, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task SupabaseService_UploadsToDeterministicPath_WithUpsertHeader()
        {
            var options = Options.Create(new SupabaseOptions
            {
                Url = "https://xyzcompany.supabase.co",
                ServiceRoleKey = "secret-service-role-key-test",
                AvatarBucket = "avatars"
            });
            var handler = new MockHttpMessageHandler();
            var httpClient = new HttpClient(handler);
            var service = new SupabaseStorageService(httpClient, options, NullLogger<SupabaseStorageService>.Instance);

            int userId = 42;
            var bytes = CreateValidWebpBytes();
            using var stream = new MemoryStream(bytes);

            string publicUrl = await service.UploadAvatarAsync(userId, stream, "myavatar.webp", "image/webp");

            Assert.NotNull(handler.LastRequest);
            Assert.Equal(HttpMethod.Post, handler.LastRequest.Method);
            Assert.Equal("https://xyzcompany.supabase.co/storage/v1/object/avatars/42/avatar.webp", handler.LastRequest.RequestUri?.GetLeftPart(UriPartial.Path));
            
            // Authorization and apikey verification
            Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization?.Scheme);
            Assert.Equal("secret-service-role-key-test", handler.LastRequest.Headers.Authorization?.Parameter);
            Assert.Contains(handler.LastRequest.Headers.GetValues("apikey"), v => v == "secret-service-role-key-test");
            Assert.Contains(handler.LastRequest.Headers.GetValues("x-upsert"), v => v == "true");

            // Verify public URL contains expected host, bucket, deterministic path, and cache buster
            Assert.StartsWith("https://xyzcompany.supabase.co/storage/v1/object/public/avatars/42/avatar.webp?v=", publicUrl);
        }

        [Fact]
        public async Task SupabaseService_RejectsNonPositiveUserId()
        {
            var options = Options.Create(new SupabaseOptions
            {
                Url = "https://xyzcompany.supabase.co",
                ServiceRoleKey = "secret-key",
                AvatarBucket = "avatars"
            });
            var handler = new MockHttpMessageHandler();
            var service = new SupabaseStorageService(new HttpClient(handler), options, NullLogger<SupabaseStorageService>.Instance);

            using var stream = new MemoryStream(CreateValidPngBytes());

            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.UploadAvatarAsync(0, stream, "test.png", "image/png")
            );
            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.UploadAvatarAsync(-5, stream, "test.png", "image/png")
            );
        }

        // ==========================================
        // 3. USER SERVICE BASE64 RESTRICTION TESTS
        // ==========================================

        [Fact]
        public async Task UserService_RejectsRawBase64ProfilePhotoInUpdateProfile()
        {
            var (db, conn) = CreateInMemoryDbContext();
            using (conn)
            using (db)
            {
                var user = new User
                {
                    Id = 100,
                    FullName = "Alice Smith",
                    Email = "alice@example.com",
                    PasswordHash = "hash"
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();

                var userService = new UserService(db, new ReportRepository());

                var updateDto = new UpdateProfileDto
                {
                    FullName = "Alice Smith Updated",
                    ProfilePhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
                };

                var result = await userService.UpdateProfileAsync(user.Id, updateDto);

                Assert.False(result.IsSuccess);
                Assert.Contains("Raw base64 image data cannot be stored directly", result.Message);

                // Verify database value remained untouched
                var reloadedUser = await db.Users.FindAsync(user.Id);
                Assert.Null(reloadedUser?.ProfilePhoto);
            }
        }

        [Fact]
        public async Task UserService_AllowsValidUrlInUpdateProfile()
        {
            var (db, conn) = CreateInMemoryDbContext();
            using (conn)
            using (db)
            {
                var user = new User
                {
                    Id = 101,
                    FullName = "Bob Jones",
                    Email = "bob@example.com",
                    PasswordHash = "hash"
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();

                var userService = new UserService(db, new ReportRepository());

                string supabaseUrl = "https://xyzcompany.supabase.co/storage/v1/object/public/avatars/101/avatar.webp?v=123456";
                var updateDto = new UpdateProfileDto
                {
                    FullName = "Bob Jones",
                    ProfilePhoto = supabaseUrl
                };

                var result = await userService.UpdateProfileAsync(user.Id, updateDto);

                Assert.True(result.IsSuccess);
                var reloadedUser = await db.Users.FindAsync(user.Id);
                Assert.Equal(supabaseUrl, reloadedUser?.ProfilePhoto);
            }
        }

        // ==========================================
        // 4. MIGRATION SERVICE TESTS
        // ==========================================

        [Fact]
        public async Task MigrationService_DryRun_ReportsActionsWithoutModifyingDatabase()
        {
            var (db, conn) = CreateInMemoryDbContext();
            using (conn)
            using (db)
            {
                var base64Png = Convert.ToBase64String(CreateValidPngBytes());

                var user1 = new User { Id = 201, FullName = "U1", Email = "u1@test.com", ProfilePhoto = $"data:image/png;base64,{base64Png}" };
                var user2 = new User { Id = 202, FullName = "U2", Email = "u2@test.com", ProfilePhoto = "https://xyz.supabase.co/storage/v1/object/public/avatars/202/avatar.png" };
                db.Users.AddRange(user1, user2);
                await db.SaveChangesAsync();

                var options = Options.Create(new SupabaseOptions
                {
                    Url = "https://xyz.supabase.co",
                    ServiceRoleKey = "key",
                    AvatarBucket = "avatars"
                });
                var handler = new MockHttpMessageHandler();
                var storageService = new SupabaseStorageService(new HttpClient(handler), options, NullLogger<SupabaseStorageService>.Instance);
                var migrationService = new ProfileImageMigrationService(db, storageService, options, NullLogger<ProfileImageMigrationService>.Instance, new HttpClient(handler));

                var report = await migrationService.MigrateAllAsync(dryRun: true);

                Assert.True(report.IsDryRun);
                Assert.Equal(2, report.TotalUsersExamined);
                Assert.Equal(1, report.MigratedCount); // user1 would be migrated
                Assert.Equal(1, report.SkippedCount);  // user2 is already Supabase
                Assert.Equal(0, report.FailedCount);

                // Assert database records did NOT change in dry run
                var checkUser1 = await db.Users.FindAsync(201);
                Assert.StartsWith("data:image/png;base64,", checkUser1?.ProfilePhoto);
            }
        }

        [Fact]
        public async Task MigrationService_Execute_MigratesBase64AndUpdatesDatabase_Idempotently()
        {
            var (db, conn) = CreateInMemoryDbContext();
            using (conn)
            using (db)
            {
                var base64Png = Convert.ToBase64String(CreateValidPngBytes());

                var user = new User { Id = 301, FullName = "U301", Email = "u301@test.com", ProfilePhoto = $"data:image/png;base64,{base64Png}" };
                db.Users.Add(user);
                await db.SaveChangesAsync();

                var options = Options.Create(new SupabaseOptions
                {
                    Url = "https://xyz.supabase.co",
                    ServiceRoleKey = "key",
                    AvatarBucket = "avatars"
                });
                var handler = new MockHttpMessageHandler();
                var storageService = new SupabaseStorageService(new HttpClient(handler), options, NullLogger<SupabaseStorageService>.Instance);
                var migrationService = new ProfileImageMigrationService(db, storageService, options, NullLogger<ProfileImageMigrationService>.Instance, new HttpClient(handler));

                // First run: should migrate
                var report1 = await migrationService.MigrateAllAsync(dryRun: false);
                Assert.Equal(1, report1.MigratedCount);
                Assert.Equal(0, report1.SkippedCount);

                var updatedUser = await db.Users.FindAsync(301);
                Assert.NotNull(updatedUser?.ProfilePhoto);
                Assert.StartsWith("https://xyz.supabase.co/storage/v1/object/public/avatars/301/avatar.png?v=", updatedUser.ProfilePhoto);

                // Second run: should be idempotent and skip
                var report2 = await migrationService.MigrateAllAsync(dryRun: false);
                Assert.Equal(0, report2.MigratedCount);
                Assert.Equal(1, report2.SkippedCount);
            }
        }

        [Fact]
        public async Task MigrationService_FlagsCorruptDataForManualIntervention()
        {
            var (db, conn) = CreateInMemoryDbContext();
            using (conn)
            using (db)
            {
                var user = new User { Id = 401, FullName = "U401", Email = "u401@test.com", ProfilePhoto = "data:image/png;base64,NOT_VALID_BASE64_DATA!!!!" };
                db.Users.Add(user);
                await db.SaveChangesAsync();

                var options = Options.Create(new SupabaseOptions
                {
                    Url = "https://xyz.supabase.co",
                    ServiceRoleKey = "key",
                    AvatarBucket = "avatars"
                });
                var handler = new MockHttpMessageHandler();
                var storageService = new SupabaseStorageService(new HttpClient(handler), options, NullLogger<SupabaseStorageService>.Instance);
                var migrationService = new ProfileImageMigrationService(db, storageService, options, NullLogger<ProfileImageMigrationService>.Instance, new HttpClient(handler));

                var report = await migrationService.MigrateAllAsync(dryRun: false);

                Assert.Equal(1, report.ManualInterventionCount);
                Assert.Equal(0, report.MigratedCount);

                // Original data preserved safely
                var reloaded = await db.Users.FindAsync(401);
                Assert.Equal("data:image/png;base64,NOT_VALID_BASE64_DATA!!!!", reloaded?.ProfilePhoto);
            }
        }
    }
}
