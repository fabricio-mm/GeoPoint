using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using GeoPointAPI.Enums;
namespace GeoPointAPI.Models;

[Table("LOCATIONS")]
public class Location
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }
    
    [Column("user_id")]
    public Guid? UserId { get; set; }
    
    [Column("name")]
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [Column("type")]
    [Required]
    public LocationType Type { get; set; }
    
    [Column("latitude", TypeName = "decimal(10,8)")]
    public decimal Latitude { get; set; }
    
    [Column("longitude", TypeName = "decimal(11,8)")]
    public decimal Longitude { get; set; }

    [Column("radius_meters")] 
    public int RadiusMeters { get; set; } = 100;
    
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }




}