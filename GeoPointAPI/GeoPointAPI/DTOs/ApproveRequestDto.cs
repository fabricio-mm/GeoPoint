using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;

namespace GeoPointAPI.DTOs;

public class ReviewRequestDto
{
    [Required]
    public Guid ReviewerId { get; set; } // Quem está avaliando

    [Required]
    public RequestStatus NewStatus { get; set; } // Approved ou Rejected

    // 👇 É aqui que o chefe escreve o motivo da aprovação ou rejeição
    public string? Comment { get; set; }
}
