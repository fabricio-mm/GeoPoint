using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;
using Microsoft.AspNetCore.Http; // Necessário para IFormFile

namespace GeoPointAPI.DTOs;

public class CreateRequestDto
{
    [Required]
    public Guid RequesterId { get; set; }

    [Required]
    public RequestType Type { get; set; }

    [Required]
    public DateTime TargetDate { get; set; }

    public string? Justification { get; set; }

    // 👇 O campo que estava faltando para o upload
    public List<IFormFile>? Attachments { get; set; }
}
