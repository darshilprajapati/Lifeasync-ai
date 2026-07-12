using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LifeSyncAI.Core.Contracts.Interfaces.Services;
using LifeSyncAI.Core.Database;
using LifeSyncAI.Core.DTO.Input.Vault;
using LifeSyncAI.Core.DTO.Output.Vault;
using LifeSyncAI.Core.Models;
using LifeSyncAI.Core.Responses;

namespace LifeSyncAI.Core.Services
{
    public class VaultService : IVaultService
    {
        private readonly ApplicationDbContext _context;

        // AES Symmetric Encryption Parameters (32-byte key, 16-byte IV)
        private static readonly byte[] AesKey = Encoding.UTF8.GetBytes("LifeSyncAIPasswordEncryptionKey!");
        private static readonly byte[] AesIV = Encoding.UTF8.GetBytes("LifeSyncAI_IVKey");

        public VaultService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ApiResponse<List<VaultItemDto>>> GetItemsAsync(int userId)
        {
            try
            {
                var items = await _context.VaultItems
                    .Where(x => x.UserId == userId)
                    .ToListAsync();

                var dtos = new List<VaultItemDto>();
                foreach (var item in items)
                {
                    string decryptedContent;
                    try
                    {
                        decryptedContent = DecryptString(item.EncryptedContent);
                    }
                    catch
                    {
                        decryptedContent = "[Decryption Failed - Key Mismatch]";
                    }

                    dtos.Add(new VaultItemDto
                    {
                        Id = item.Id,
                        Title = item.Title,
                        Content = decryptedContent,
                        UserId = item.UserId
                    });
                }

                return ApiResponse<List<VaultItemDto>>.Success(dtos, "Secure vault items retrieved and decrypted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<List<VaultItemDto>>.Fail($"Failed to load vault items: {ex.Message}");
            }
        }

        public async Task<ApiResponse<VaultItemDto>> CreateItemAsync(CreateVaultItemDto dto, int userId)
        {
            try
            {
                var encryptedContent = EncryptString(dto.Content);

                var item = new VaultItem
                {
                    Title = dto.Title,
                    EncryptedContent = encryptedContent,
                    UserId = userId
                };

                await _context.VaultItems.AddAsync(item);
                await _context.SaveChangesAsync();

                var createdDto = new VaultItemDto
                {
                    Id = item.Id,
                    Title = dto.Title,
                    Content = dto.Content, // return decrypted to the user on success
                    UserId = userId
                };

                return ApiResponse<VaultItemDto>.Success(createdDto, "Vault item encrypted and saved successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<VaultItemDto>.Fail($"Failed to encrypt and save vault item: {ex.Message}");
            }
        }

        public async Task<ApiResponse<bool>> DeleteItemAsync(int id)
        {
            try
            {
                var item = await _context.VaultItems.FindAsync(id);
                if (item != null)
                {
                    _context.VaultItems.Remove(item);
                    await _context.SaveChangesAsync();
                }

                return ApiResponse<bool>.Success(true, "Vault item deleted successfully.");
            }
            catch (Exception ex)
            {
                return ApiResponse<bool>.Fail($"Failed to delete vault item: {ex.Message}");
            }
        }

        #region AES Cryptography Helpers

        private static string EncryptString(string plainText)
        {
            using (var aes = Aes.Create())
            {
                aes.Key = AesKey;
                aes.IV = AesIV;

                using (var encryptor = aes.CreateEncryptor(aes.Key, aes.IV))
                using (var ms = new MemoryStream())
                {
                    using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
                    using (var sw = new StreamWriter(cs))
                    {
                        sw.Write(plainText);
                    }
                    return Convert.ToBase64String(ms.ToArray());
                }
            }
        }

        private static string DecryptString(string cipherText)
        {
            using (var aes = Aes.Create())
            {
                aes.Key = AesKey;
                aes.IV = AesIV;

                using (var decryptor = aes.CreateDecryptor(aes.Key, aes.IV))
                using (var ms = new MemoryStream(Convert.FromBase64String(cipherText)))
                using (var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read))
                using (var sr = new StreamReader(cs))
                {
                    return sr.ReadToEnd();
                }
            }
        }

        #endregion
    }
}
