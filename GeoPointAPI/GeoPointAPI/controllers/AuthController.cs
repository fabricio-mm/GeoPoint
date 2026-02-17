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
        // 1. Busca o usuário
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
            return Unauthorized(new { message = "Usuário ou senha inválidos." });

        // 2. Verifica se está inativo (Soft Delete)
        if (user.Status == UserStatus.Inactive)
        {
            return Unauthorized(new { message = "Este usuário foi desativado pelo administrador." });
        }

        // 3. Validação de Senha (Hash)
        var senhaDigitadaHash = ComputeHash(dto.Password);

        // Verifica se a senha no banco bate com o hash gerado
        // (Certifique-se que no banco a senha já está salva como hash!)
        if (user.Password != senhaDigitadaHash)
            return Unauthorized(new { message = "Usuário ou senha inválidos." });

        // 4. Gera o Token JWT
        var token = _tokenService.GenerateToken(user);

        // 5. Retorna Token + Dados do Usuário (Atualizado com JobTitle e Department)
        return Ok(new
        {
            token = token,
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.Role,        // Ex: Employee (CLT)
                user.JobTitle,    // Ex: Manager (Pode aprovar) -> CRÍTICO PRO FRONT
                user.Department,  // Ex: TI
                user.Status
            }
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
