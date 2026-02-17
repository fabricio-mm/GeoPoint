using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GeoPointAPI.Models;
using Microsoft.IdentityModel.Tokens;

namespace GeoPointAPI.Services;

public class TokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Email, user.Email),

            // Tipo de Contrato (Employee, Contractor, Intern)
            new Claim(ClaimTypes.Role, user.Role.ToString()),

            // 👇 NOVAS REGRAS DE NEGÓCIO
            // JobTitle: Define a permissão real (Manager aprova, Developer não)
            new Claim("JobTitle", user.JobTitle.ToString()),

            // Department: Útil para filtrar solicitações (Gerente de TI só vê TI)
            new Claim("Department", user.Department.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken
        (
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8), // Token dura o dia de trabalho
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
