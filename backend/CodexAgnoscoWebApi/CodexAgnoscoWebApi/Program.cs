using OpenAI.Chat;

namespace CodexAgnoscoWebApi;

using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using System.Net.Http.Json;
using OpenAI;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddSingleton<CodeIndex>();
        builder.Services.AddHttpClient();
        var app = builder.Build();

        app.MapPost("/analyze", async (HttpContext ctx, CodeIndex index, IHttpClientFactory httpClientFactory) =>
        {
            var req = await JsonSerializer.DeserializeAsync<AnalyzeRequest>(ctx.Request.Body);
            Console.WriteLine(ctx.Request.Body);

            // 🔹 Ensure repo is indexed
            var repoRoot = Path.GetDirectoryName(req!.filePath)!;
            Console.WriteLine("Repo root:" + repoRoot);
            var indexMarker = Path.Combine(repoRoot, ".codexagnosco", "index.faiss");
            if (!File.Exists(indexMarker))
            {
                Directory.CreateDirectory(Path.Combine(repoRoot, ".codexagnosco"));
                await index.IndexRepository(repoRoot); // Folder-based indexing instead of .sln
            }

            // 🔹 Extract target function
            var targetCode = index.GetCodeByLocation(req.filePath, req.lineNumber);

            Console.WriteLine("Target code: " + targetCode);

            // 2. Query FAISS
            var http = httpClientFactory.CreateClient();
            var faissResp = await http.PostAsJsonAsync("http://localhost:8001/search", targetCode);
            var faissData = await faissResp.Content.ReadFromJsonAsync<SearchResult>();

            // 3. Build prompt
            var prompt = PromptBuilder.Build(targetCode, faissData!.Results);
            Console.WriteLine("Prompt: " + prompt);

            // 4. Call ChatGPT API
            var client = new OpenAIClient("");
            var chatClient = client.GetChatClient("gpt-5-nano");

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage("You are a helpful code assistant. Provide concise explanations."),
                new UserChatMessage(prompt)
            };

            ChatCompletion completion = await chatClient.CompleteChatAsync(messages);
            return Results.Ok(new { explanation = completion.Content[0].Text });
        });

        app.Run();
    }
}
record AnalyzeRequest(string filePath, int lineNumber);

public record FaissChunk(string file, string symbol, string code);
record SearchResult(List<FaissChunk> Results);