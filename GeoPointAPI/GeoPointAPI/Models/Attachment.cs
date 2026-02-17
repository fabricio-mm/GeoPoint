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

    // 👇 CAMPOS DO GOOGLE DRIVE (Adicionados)
    [Column("google_drive_file_id")]
    public string? GoogleDriveFileId { get; set; } // O ID que vem da API do Google

    [Column("file_name")]
    [Required]
    public string FileName { get; set; } = string.Empty; // O nome original do arquivo

    // 👇 CAMPOS ANTIGOS (Tornados Opcionais para não quebrar o save)
    [Column("file_url", TypeName = "text")]
    public string? FileUrl { get; set; } // Pode ser usado futuramente para o Link de Visualização

    [Column("file_type")]
    [MaxLength(50)]
    public string? FileType { get; set; } // Ex: application/pdf

    [ForeignKey("RequestId")]
    public virtual Request? Request { get; set; }
}
