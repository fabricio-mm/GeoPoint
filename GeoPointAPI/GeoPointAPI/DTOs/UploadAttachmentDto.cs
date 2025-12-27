using System.ComponentModel.DataAnnotations;

namespace GeoPointAPI.DTOs;

public class UploadAttachmentDto
{
    [Required]
    public Guid RequestId { get; set; }

    [Required]
    public IFormFile File { get; set; }
}