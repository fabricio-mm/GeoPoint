using Microsoft.EntityFrameworkCore; 

namespace GeoPointAPI.data; 
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
}