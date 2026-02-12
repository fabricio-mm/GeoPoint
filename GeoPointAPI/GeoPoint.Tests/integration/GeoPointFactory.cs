using GeoPointAPI.data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authorization.Policy; // Adicione este using!

namespace GeoPoint.Tests.Integration;

public class GeoPointFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // 1. Remove Banco Real
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            // 2. Adiciona Banco Fake
            services.AddDbContext<AppDbContext>(options =>
            {
                options.UseInMemoryDatabase("BancoTesteMemoria");
            });

            // 👇 3. A MÁGICA: Substitui o avaliador de políticas de segurança 👇
            services.AddSingleton<IPolicyEvaluator, FakePolicyEvaluator>();
        });
    }
}
