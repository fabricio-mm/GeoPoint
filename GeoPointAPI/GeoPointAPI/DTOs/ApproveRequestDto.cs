using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;

namespace GeoPointAPI.DTOs;

public class ReviewRequestDto
{
    [Required]
    public Guid ReviewerId { get; set; } // ID do Reviewer

    [Required]
    public RequestStatus NewStatus { get; set; } // Approved ou Rejected
}