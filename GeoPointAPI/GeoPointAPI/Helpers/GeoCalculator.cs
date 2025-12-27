namespace GeoPointAPI.Helpers;

public static class GeoCalculator
{
    // Raio médio da Terra em Quilômetros
    private const double EarthRadiusKm = 6371.0;

    public static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
    {
        // Converte graus para radianos
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        lat1 = ToRadians(lat1);
        lat2 = ToRadians(lat2);

        // Haversine
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2) * Math.Cos(lat1) * Math.Cos(lat2);
        
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        
        // Distância em Km
        var distanceKm = EarthRadiusKm * c;

        // Retorna em Metros
        return distanceKm * 1000; 
    }

    private static double ToRadians(double angle)
    {
        return Math.PI * angle / 180.0;
    }
}