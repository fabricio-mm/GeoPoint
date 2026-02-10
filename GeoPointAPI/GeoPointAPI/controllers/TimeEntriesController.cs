using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using GeoPointAPI.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace GeoPointAPI.controllers;
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TimeEntriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public TimeEntriesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTimeEntryDto dto)
    {
        var user = await _context.Users.FindAsync(dto.UserId);
        if (user == null) return NotFound("User not found");
        
        // TODO: Aqui vai entrar a lógica do GEOFENCING 
        // 2. GEOFENCING: Busca locais permitidos
        // Regra: Traz locais onde o UserId é NULL (Sede da Empresa) 
        //        OU onde o UserId é igual ao do usuário (Home Office dele)
        var allowedLocations = await _context.Locations
            .Where(l => l.UserId == null || l.UserId == dto.UserId)
            .ToListAsync();

        if (!allowedLocations.Any())
        {
            return BadRequest("Nenhum local de trabalho configurado para este usuário.");
        }

        bool isInsideFence = false;
        string locationName = ""; // Para saber onde ele bateu o ponto

        foreach (var loc in allowedLocations)
        {
            // Convertemos decimal para double para fazer a conta matemática
            double distance = GeoCalculator.CalculateDistanceMeters(
                (double)dto.Latitude, 
                (double)dto.Longitude, 
                (double)loc.Latitude, 
                (double)loc.Longitude
            );

            // Verifica se está dentro do raio (ex: 100 metros)
            if (distance <= loc.RadiusMeters)
            {
                isInsideFence = true;
                locationName = loc.Name;
                break; // Se achou um, já pode parar de procurar
            }
        }

        // 3. O Veredito
        if (!isInsideFence)
        {
            // Opcional: Você pode salvar o ponto mesmo assim mas marcar uma flag "ForaDeLocal"
            // Mas para este exemplo, vamos bloquear:
            return BadRequest(new 
            { 
                message = "Você está fora do local de trabalho permitido.",
                your_coords = new { dto.Latitude, dto.Longitude }
            });
        }
        // Por enquanto aceitamos tudo

        var timeEntry = new TimeEntry()
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            TimestampUtc = DateTime.UtcNow,
            Type = dto.Type,
            Origin = dto.Origin,
            LatitudeRecorded = dto.Latitude,
            LongitudeRecorded = dto.Longitude,
            IsManualAdjustment = false,
        };
        
        _context.TimeEntries.Add(timeEntry);
        await _context.SaveChangesAsync();
        return Ok(new
        {
            message = $"Ponto registrado com sucesso em: {locationName}.",
            entry = timeEntry
        });
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(Guid userId)
    {
        var entries = await _context.TimeEntries
            .Where(e => e.UserId == userId)
            .OrderByDescending(t=> t.TimestampUtc) // Mais recente primeiro
            .Take(50) //Paginação simples 
            .ToListAsync();
        return Ok(entries);
    }
}