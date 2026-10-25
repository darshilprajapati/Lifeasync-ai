using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using LifeSyncAI.Core.Models;

namespace LifeSyncAI.Core.Helpers
{
    /// <summary>
    /// Utility for generating and validating JSON Web Tokens (JWT) and Refresh Tokens.
    /// </summary>
    public static class JwtHelper
    {
        /// <summary>
        /// Generates a JWT access token for a user.
        /// </summary>
        public static string GenerateAccessToken(User user, string secretKey, string issuer, string audience, int expiryMinutes)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var now = DateTime.UtcNow;
            var expires = now.AddMinutes(expiryMinutes);
            var notBefore = expiryMinutes < 0 ? expires.AddMinutes(-5) : now;

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                NotBefore = notBefore,
                Expires = expires,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Generates a cryptographically secure refresh token.
        /// </summary>
        public static string GenerateRefreshToken()
        {
            var randomNumber = new byte[64];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        /// <summary>
        /// Validates an active JWT access token, strictly enforcing signature, algorithm, issuer, audience, and expiration.
        /// Rejects expired or tampered tokens.
        /// </summary>
        public static ClaimsPrincipal? ValidateAccessToken(string token, string secretKey, string? issuer = null, string? audience = null)
        {
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(secretKey))
                return null;

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = !string.IsNullOrWhiteSpace(issuer),
                ValidIssuer = issuer,
                ValidateAudience = !string.IsNullOrWhiteSpace(audience),
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
                if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                    !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                {
                    return null;
                }

                return principal;
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Validates the cryptographic signature, header algorithm, and structural integrity of an access token
        /// specifically for token refresh workflows, while allowing the caller to safely extract claims from an expired token.
        /// </summary>
        public static ClaimsPrincipal? GetPrincipalFromExpiredToken(string token, string secretKey, string? issuer = null, string? audience = null)
        {
            if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(secretKey))
                return null;

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ValidateIssuer = !string.IsNullOrWhiteSpace(issuer),
                ValidIssuer = issuer,
                ValidateAudience = !string.IsNullOrWhiteSpace(audience),
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                // Allow expired tokens specifically for refresh flows, but ensure reasonable validity bounds
                LifetimeValidator = (notBefore, expires, securityToken, validationParameters) =>
                {
                    if (notBefore.HasValue && notBefore.Value > DateTime.UtcNow.AddMinutes(5))
                    {
                        return false;
                    }

                    if (expires.HasValue && expires.Value < DateTime.UtcNow.AddDays(-30))
                    {
                        return false;
                    }

                    return true;
                }
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            try
            {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);
                if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                    !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                {
                    throw new SecurityTokenException("Invalid token signing algorithm.");
                }

                return principal;
            }
            catch
            {
                return null;
            }
        }
    }
}
