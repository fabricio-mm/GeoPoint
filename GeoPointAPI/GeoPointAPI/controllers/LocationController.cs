using GeoPointAPI.data;
using GeoPointAPI.DTOs;
using GeoPointAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GeoPointAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public LocationsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Inclui os dados do dono da casa (se houver)
        return Ok(await _context.Locations.Include(l => l.User).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLocationDto dto)
    {
        // Validação: Se mandou UserId, verifica se o usuário existe
        if (dto.UserId.HasValue)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
            if (!userExists)
                return BadRequest("Usuário informado não existe.");
        }

        var location = new Location
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Name = dto.Name,
            Type = dto.Type,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
            RadiusMeters = dto.RadiusMeters
        };

        _context.Locations.Add(location);
        await _context.SaveChangesAsync();

        return Ok(location);
    }
}