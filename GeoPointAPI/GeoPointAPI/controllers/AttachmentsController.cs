using GeoPointAPI.data;
using GeoPointAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GeoPointAPI.DTOs;

namespace GeoPointAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AttachmentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment; // Para saber onde está a pasta do servidor

    public AttachmentsController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpPost]
    // Mudamos para receber o DTO com [FromForm]
    public async Task<IActionResult> Upload([FromForm] UploadAttachmentDto dto) 
    {
        // 1. Validações básicas (agora acessamos dto.File)
        if (dto.File == null || dto.File.Length == 0)
            return BadRequest("Arquivo inválido.");

        // Acessamos dto.RequestId
        var requestExists = await _context.Requests.AnyAsync(r => r.Id == dto.RequestId);
        if (!requestExists)
            return NotFound("Solicitação (Request) não encontrada.");

        // 2. Salvar o arquivo no disco
        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? Directory.GetCurrentDirectory(), "uploads");
        if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}_{dto.File.FileName}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await dto.File.CopyToAsync(stream);
        }

        // 3. Salvar o registro no Banco de Dados
        var attachment = new Attachment
        {
            Id = Guid.NewGuid(),
            RequestId = dto.RequestId, // dto.RequestId
            FileUrl = $"/uploads/{uniqueFileName}",
            FileType = dto.File.ContentType 
        };

        _context.Attachments.Add(attachment);
        await _context.SaveChangesAsync();

        return Ok(attachment);
    }

    // Baixar o arquivo (Download)
    [HttpGet("{id}")]
    public async Task<IActionResult> Download(Guid id)
    {
        var attachment = await _context.Attachments.FindAsync(id);
        if (attachment == null) return NotFound();

        // Pega o caminho físico do arquivo
        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? Directory.GetCurrentDirectory(), "uploads");
        var fileName = Path.GetFileName(attachment.FileUrl); // Remove o "/uploads/"
        var filePath = Path.Combine(uploadsFolder, fileName);

        if (!System.IO.File.Exists(filePath)) 
            return NotFound("Arquivo físico não encontrado no servidor.");

        var bytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(bytes, attachment.FileType, fileName);
    }
}