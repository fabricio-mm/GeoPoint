using System.Security.Cryptography;
using System.Text;
using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Enums;
using GeoPointAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly TokenService _tokenService;

    public AuthController(AppDbContext context, TokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
            return Unauthorized("Usuário ou senha inválidos.");

        if (user.Status == UserStatus.Inactive)
        {
            return Unauthorized("Este usuário foi desativado");
        }

        var senhaDigitadaHash = ComputeHash(dto.Password);

        if (user.Password != senhaDigitadaHash)
            return Unauthorized("Usuário ou senha inválidos.");

        var token = _tokenService.GenerateToken(user);

        return Ok(new
        {
            token = token,
            user = new { user.Id, user.FullName, user.Email, user.Role }
        });
    }


    private string ComputeHash(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;

        using (SHA256 sha256 = SHA256.Create())
        {
            byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < bytes.Length; i++)
            {
                builder.Append(bytes[i].ToString("x2"));
            }
            return builder.ToString();
        }
    }
}
