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

    // --- 🛡️ MÉTODO PRIVADO DE VALIDAÇÃO (O "FILTRO" DA API) ---
    private async Task<(bool IsValid, string Message)> ValidateUserIntegrity(CreateUserDto dto)
    {
        // 1. Validar se os Enums existem no sistema
        if (!Enum.IsDefined(typeof(UserRole), dto.Role))
            return (false, $"O valor de contrato (Role) '{dto.Role}' não existe.");

        if (!Enum.IsDefined(typeof(JobTitle), dto.JobTitle))
            return (false, $"O cargo (JobTitle) '{dto.JobTitle}' não existe.");

        if (!Enum.IsDefined(typeof(Department), dto.Department))
            return (false, $"O departamento '{dto.Department}' não existe.");

        // 2. Validar se a escala de trabalho existe no banco
        var workScheduleExists = await _context.WorkSchedules.AnyAsync(w => w.Id == dto.WorkScheduleId);
        if (!workScheduleExists)
            return (false, "A escala de trabalho (WorkScheduleId) informada não existe no banco de dados.");

        // 3. Regra de Compliance: Estagiário não pode ser Gerente
        if (dto.Role == UserRole.Intern && dto.JobTitle == JobTitle.Manager)
            return (false, "Violação de hierarquia: Um estagiário não pode ocupar o cargo de Gerente.");

        return (true, string.Empty);
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
            return NotFound(new { message = "Usuário não encontrado." });

        return Ok(user);
    }

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        // Aplica validações de integridade
        var validation = await ValidateUserIntegrity(dto);
        if (!validation.IsValid) return BadRequest(new { message = validation.Message });

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest(new { message = "E-mail já cadastrado." });

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Role = dto.Role,
            Status = UserStatus.Active,
            WorkScheduleId = dto.WorkScheduleId,
            Password = ComputeHash(dto.Password),
            Department = dto.Department,
            JobTitle = dto.JobTitle
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = newUser.Id },
            new { newUser.Id, newUser.FullName, newUser.Email, newUser.Role });
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> CreateBulk([FromBody] List<CreateUserDto> dtos)
    {
        if (dtos == null || !dtos.Any())
            return BadRequest(new { message = "A lista de usuários está vazia." });

        // Valida cada item da lista antes de qualquer inserção
        foreach (var dto in dtos)
        {
            var validation = await ValidateUserIntegrity(dto);
            if (!validation.IsValid)
                return BadRequest(new { message = $"Erro no usuário {dto.FullName}: {validation.Message}" });

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { message = $"O e-mail {dto.Email} já está em uso." });
        }

        var newUsers = dtos.Select(dto => new User
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Password = ComputeHash(dto.Password),
            Role = dto.Role,
            Department = dto.Department,
            JobTitle = dto.JobTitle,
            WorkScheduleId = dto.WorkScheduleId,
            Status = UserStatus.Active
        }).ToList();

        _context.Users.AddRange(newUsers);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"{newUsers.Count} usuários criados com sucesso!" });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateUserDto dto)
    {
        var validation = await ValidateUserIntegrity(dto);
        if (!validation.IsValid) return BadRequest(new { message = validation.Message });

        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Role = dto.Role;
        user.WorkScheduleId = dto.WorkScheduleId;
        user.Password = ComputeHash(dto.Password);
        user.Department = dto.Department;
        user.JobTitle = dto.JobTitle;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeactivateUser(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        user.Status = UserStatus.Inactive;
        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return NoContent();
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
