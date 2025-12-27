using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;

namespace GeoPointAPI.DTOs;

public class CreateRequestDto
{
    [Required]
    public Guid RequesterId { get; set; } //Quem está pedindo
    
    [Required]
    public RequestType Type { get; set; } //Atestado ou esquecimento
    
    [Required]
    public DateTime TargetDate { get; set; } // Para qual dia é o abono

    public string? Justification { get; set; } // Texto explicando
}