using GeoPointAPI.data;
using GeoPointAPI.DTOs;
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

        if (user.Password != dto.Password)
            return Unauthorized("Usuário ou senha inválidos");
        
        var token = _tokenService.GenerateToken(user);

        return Ok(new
        {
            token = token,
            user = new { user.Id, user.FullName, user.Email, user.Role }
        });
        
    }
}