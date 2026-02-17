using System.ComponentModel.DataAnnotations;
using GeoPointAPI.Enums;
namespace GeoPointAPI.DTOs;

public class CreateUserDto
{
    [Required]
    public string FullName { get; set; } = String.Empty;

    [Required]
    [EmailAddress]
    public string Email { get; set; } = String.Empty;

    [Required]
    public string Password { get; set; } = String.Empty;

    [Required]
    public UserRole Role { get; set; }

    [Required]
    public WorkScheduleType WorkScheduleId { get; set; } // O Front manda 0, 1 ou 2

    [Required]
    public Department Department { get; set; }

    [Required]
    public JobTitle JobTitle { get; set; }
}
