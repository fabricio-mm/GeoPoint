using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace GeoPointAPI.Models;

[Table("ATTACHMENTS")]
public class Attachment
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }
    
    [Column("request_id")]
    public Guid RequestId { get; set; }
    
    [Column("file_url", TypeName = "text")]
    [Required]
    public string FileUrl { get; set; } =  string.Empty;
    
    [Column("file_type")]
    [Required]
    [MaxLength(50)]
    public string FileType { get; set; } = string.Empty;
    
    [ForeignKey("RequestId")]
    public virtual Request? Request { get; set; }
}