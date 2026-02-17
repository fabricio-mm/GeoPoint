using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration; // Necessário para ler a config

namespace GeoPointAPI.Services;

public class GoogleDriveService
{
    private readonly DriveService _service;
    private readonly string _folderId = "1jp1dggVoespNzdqIMaeGBKQjg6ukcmTy"; // ID da pasta pode ficar aqui, não é secreto

    // Injeção de Dependência da Configuração
    public GoogleDriveService(IConfiguration configuration)
    {
        // Busca as chaves do Cofre (User Secrets) ou Variáveis de Ambiente
        var clientId = configuration["GoogleDrive:ClientId"];
        var clientSecret = configuration["GoogleDrive:ClientSecret"];
        var refreshToken = configuration["GoogleDrive:RefreshToken"];

        if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret) || string.IsNullOrEmpty(refreshToken))
        {
            throw new Exception("As credenciais do Google Drive não foram encontradas. Verifique o User Secrets.");
        }

        var tokenResponse = new TokenResponse { RefreshToken = refreshToken };

        var clientSecrets = new ClientSecrets
        {
            ClientId = clientId,
            ClientSecret = clientSecret
        };

        var credentials = new UserCredential(
            new GoogleAuthorizationCodeFlow(
                new GoogleAuthorizationCodeFlow.Initializer
                {
                    ClientSecrets = clientSecrets
                }),
            "user",
            tokenResponse
        );

        _service = new DriveService(new BaseClientService.Initializer()
        {
            HttpClientInitializer = credentials,
            ApplicationName = "GeoPointAPI"
        });
    }

    public async Task<string> UploadFileAsync(IFormFile file, string requesterName)
    {
        // ... (O resto do método UploadFileAsync continua igualzinho) ...
        var fileMetadata = new Google.Apis.Drive.v3.Data.File()
        {
            Name = $"{requesterName}_{DateTime.Now:yyyyMMddHHmmss}_{file.FileName}",
            Parents = new List<string> { _folderId }
        };

        FilesResource.CreateMediaUpload request;
        using (var stream = file.OpenReadStream())
        {
            request = _service.Files.Create(fileMetadata, stream, file.ContentType);
            request.Fields = "id";
            var progress = await request.UploadAsync();
            if (progress.Status == Google.Apis.Upload.UploadStatus.Failed)
                throw new Exception($"Erro no Upload: {progress.Exception.Message}");
        }
        return request.ResponseBody?.Id ?? throw new Exception("ID nulo.");
    }
}
