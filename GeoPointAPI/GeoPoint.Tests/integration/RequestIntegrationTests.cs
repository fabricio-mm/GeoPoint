using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using GeoPointAPI.data;
using GeoPointAPI.Enums;
using Models = GeoPointAPI.Models;
using Microsoft.Extensions.DependencyInjection;

namespace GeoPoint.Tests.Integration;

public class RequestsIntegrationTests : IClassFixture<GeoPointFactory>
{
    private readonly HttpClient _client;
    private readonly GeoPointFactory _factory;

    public RequestsIntegrationTests(GeoPointFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();

    }

    [Fact]
    public async Task GetById_DeveRetornarRequest_QuandoExiste()
    {
        // 1. ARRANGE
        var idTeste = Guid.NewGuid();
        var requesterId = Guid.NewGuid(); // O ID do nosso usuário falso

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();

            // 👇 PASSO NOVO: Criar o Usuário Dono da Request 👇
            // (Sem isso, o .Include(r => r.Requester) falha e não retorna nada)
            var usuarioFalso = new Models.User
            {
                Id = requesterId,
                FullName = "Usuario Teste",
                Email = "teste@geopoint.com",
                Role = UserRole.Employee, // Ajuste conforme seu Enum de roles
                Password = "123" // Se for obrigatório
            };
            db.Users.Add(usuarioFalso);

            // Agora sim, cria a Request ligada a esse usuário
            db.Requests.Add(new Models.Request
            {
                Id = idTeste,
                RequesterId = requesterId, // Ligando ao usuário que acabamos de criar
                Type = RequestType.Certificate,
                Status = RequestStatus.Pending,
                TargetDate = DateTime.Now
            });

            await db.SaveChangesAsync();
        }

        // 2. ACT
        var response = await _client.GetAsync($"/api/Requests/{idTeste}");

        // DEBUG (Pode manter, é útil)
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var erro = await response.Content.ReadAsStringAsync();
            throw new Exception($"A API respondeu com erro: {response.StatusCode} - {erro}");
        }

        // 3. ASSERT
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var retorno = await response.Content.ReadFromJsonAsync<Models.Request>();
        retorno.Should().NotBeNull();
        retorno!.Id.Should().Be(idTeste);
    }

    [Fact]
    public async Task GetByUserId_DeveRetornarApenasRequests_DoUsuarioSolicitado()
    {
        // 1. ARRANGE (O Cenário)
        var idFabricio = Guid.NewGuid();
        var idGiovanna = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();

            // Criar dois usuários (O Alvo e o "Intruso")
            db.Users.AddRange(new List<Models.User>
            {
                new Models.User { Id = idFabricio, FullName = "Fabricio", Email = "faifas@geo.com", Role = UserRole.Employee, Password = "123" },
                new Models.User { Id = idGiovanna, FullName = "Giovanna", Email = "gio@geo.com", Role = UserRole.Admin, Password = "123" }
            });

            // Criar solicitações misturadas
            db.Requests.AddRange(new List<Models.Request>
            {
                // Duas do Fabricio
                new Models.Request { RequesterId = idFabricio, Type = RequestType.Certificate, Status = RequestStatus.Pending, TargetDate = DateTime.Now },
                new Models.Request { RequesterId = idFabricio, Type = RequestType.Certificate, Status = RequestStatus.Accepted, TargetDate = DateTime.Now.AddDays(-1) },

                // Uma da Giovanna (NÃO deve aparecer)
                new Models.Request { RequesterId = idGiovanna, Type = RequestType.ForgotPunch, Status = RequestStatus.Pending, TargetDate = DateTime.Now }
            });

            await db.SaveChangesAsync();
        }

        // 2. ACT (Ação)
        // Pedimos apenas as do Fabricio
        var response = await _client.GetAsync($"/api/Requests/user/{idFabricio}");

        // Debug (Pra garantir)
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var erro = await response.Content.ReadAsStringAsync();
            throw new Exception($"Erro da API: {response.StatusCode} - {erro}");
        }

        // 3. ASSERT (Verificação)
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var listaRetornada = await response.Content.ReadFromJsonAsync<List<Models.Request>>();

        listaRetornada.Should().NotBeNull();
        listaRetornada.Should().HaveCount(2); // Tem que ter exatamente 2 (as do Fabricio)
        listaRetornada!.Should().OnlyContain(r => r.RequesterId == idFabricio); // Garante que NENHUMA é da Giovanna
    }

    [Fact]
    public async Task Post_DeveCriarRequest_QuandoDadosSaoValidos()
    {
        // 1. ARRANGE
        var requesterId = Guid.NewGuid();

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();

            db.Users.Add(new Models.User
            {
                Id = requesterId, FullName = "Fabricio", Email = "faifas@geo.com", Role = UserRole.Employee,
                Password = "123"
            });
            await db.SaveChangesAsync();
        }

        // Objeto batendo com o seu CreateRequestDto (Justification)
        var novaRequestDto = new
        {
            RequesterId = requesterId,
            Type = RequestType.ForgotPunch,
            TargetDate = DateTime.Now.AddDays(1),
            Justification = "Esqueci de bater o ponto, Faifas!"
        };

        // 2. ACT
        var response = await _client.PostAsJsonAsync("/api/Requests", novaRequestDto);

        // 3. ASSERT
        // Agora esperando 201 Created conforme sua nova Controller!
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var salvo = db.Requests.FirstOrDefault(r => r.JustificationUser == "Esqueci de bater o ponto, Faifas!");
            salvo.Should().NotBeNull();
            salvo!.Status.Should().Be(RequestStatus.Pending);
        }
    }

    [Fact]
    public async Task Put_Review_DeveAlterarStatus_QuandoGestorAvalia()
    {
        // 1. ARRANGE
        var requestId = Guid.NewGuid();
        var idFabricio = Guid.NewGuid();
        var idGiovanna = Guid.NewGuid(); // A Gestora

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.Database.EnsureCreated();

            // Criar o Funcionário e a Gestora
            var fabricio = new Models.User { Id = idFabricio, FullName = "Fabricio", Email = "faifas@geo.com", Role = UserRole.Employee, Password = "123" };
            var giovanna = new Models.User { Id = idGiovanna, FullName = "Giovanna", Email = "gio@geo.com", Role = UserRole.Admin, Password = "123" };
            db.Users.AddRange(fabricio, giovanna);

            // Criar a solicitação Pendente
            db.Requests.Add(new Models.Request
            {
                Id = requestId,
                RequesterId = idFabricio,
                Type = RequestType.ForgotPunch,
                Status = RequestStatus.Pending,
                TargetDate = DateTime.Now
            });
            await db.SaveChangesAsync();
        }

        // DTO de Avaliação (Ajuste os nomes conforme sua ReviewRequestDto)
        var reviewDto = new
        {
            ReviewerId = idGiovanna,
            Status = RequestStatus.Accepted,
            JustificationReview = "Tudo certo, Faifas! Aprovado."
        };

        // 2. ACT
        // Ajuste a URL se o seu endpoint for diferente (ex: /api/Requests/{id}/review)
        var response = await _client.PutAsJsonAsync($"/api/Requests/{requestId}/review", reviewDto);

        // 3. ASSERT
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var salvo = db.Requests.Find(requestId);

            salvo.Should().NotBeNull();
            salvo!.Status.Should().Be(RequestStatus.Accepted); // Validou a mudança de estado
            salvo.ReviewerId.Should().Be(idGiovanna); // Validou quem aprovou
        }
    }
}
