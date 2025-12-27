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
    public UserRole Role { get; set; }
    
    [Required]
    public Guid WorkScheduleId { get; set; }
}