using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace GeoPointAPI.controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _context.Users
            .Include(u => u.WorkSchedule)
            .ToListAsync();

        return Ok(users);
    }

    // 👇 ESTE É O ÚNICO GET POR ID AGORA 👇
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.WorkSchedule)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            return NotFound(new { message = "User not found." });

        return Ok(user);
    }

    // 👇 IMPORTANTE: [AllowAnonymous] deixa criar usuário sem estar logado (pra criar o primeiro)
    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        // 1. Valida se a escala existe
        var escalaExiste = await _context.WorkSchedules.AnyAsync(w => w.Id == dto.WorkScheduleId);
        if (!escalaExiste)
        {
            return BadRequest(new { message = "Escala de trabalho inválida." });
        }

        // 2. Verifica se e-mail já existe
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
        {
            return BadRequest(new { message = "E-mail já cadastrado." });
        }

        // 3. Cria o usuário COM SENHA HASHED
        var newUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Role = dto.Role,
            Status = UserStatus.Active,
            WorkScheduleId = dto.WorkScheduleId,

            // 👇 CORREÇÃO: Usando PasswordHash para bater com seu Model e AuthController
            Password = ComputeHash(dto.Password)
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // 👇 CORREÇÃO: Aponta para 'GetById' (o único que sobrou)
        return CreatedAtAction(nameof(GetById), new { id = newUser.Id },
            new { newUser.Id, newUser.FullName, newUser.Email, newUser.Role });
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

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Role = dto.Role;
        user.WorkScheduleId = dto.WorkScheduleId;

        // Opcional: Se quiser permitir trocar senha no update, teria que fazer o hash de novo aqui
        // user.PasswordHash = ComputeHash(dto.Password);

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/Users/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeactivateUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.Status = UserStatus.Inactive;

        // Opcional: Adicionar data de demissão
        //user.TerminationDate = DateTime.Now;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
