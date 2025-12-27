using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    
    //Injeção de Dependência do Banco
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

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        var escalaExiste = await _context.WorkSchedules.AnyAsync(w => w.Id == dto.WorkScheduleId);
        if (!escalaExiste)
        {
            return BadRequest(new { message = "Escala de trabalho inválida." });
        }

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Role = dto.Role,
            Status = UserStatus.Active,
            WorkScheduleId = dto.WorkScheduleId,
        };
        
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = newUser.Id }, newUser);
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
        
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
}