using System.ComponentModel.DataAnnotations;

namespace GeoPointAPI.DTOs;

public class UpdateRequestDto
{
    [Required]
    public DateTime TargetDate { get; set; }

    [Required]
    public string Justification { get; set; } = string.Empty;
}
