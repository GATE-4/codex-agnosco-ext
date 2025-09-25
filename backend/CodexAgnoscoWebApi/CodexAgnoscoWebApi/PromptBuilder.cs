namespace CodexAgnoscoWebApi;

public static class PromptBuilder
{
    public static string Build(string targetCode, List<FaissChunk> related)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Here is a target function to explain:\n");
        sb.AppendLine("---TARGET---");
        sb.AppendLine(targetCode);
        sb.AppendLine("---END TARGET---\n");

        sb.AppendLine("Here are related snippets:\n");
        int i = 1;
        foreach (var r in related)
        {
            sb.AppendLine($"---RELATED {i}---");
            sb.AppendLine($"[FILE: {r.file} | SYMBOL: {r.symbol}]");
            sb.AppendLine(r.code);
            sb.AppendLine("---END---\n");
            i++;
        }

        sb.AppendLine("Tasks:");
        sb.AppendLine("1) Summary of what the function does.");
        sb.AppendLine("2) Key responsibilities and edge cases.");
        sb.AppendLine("3) Suggested XML docstring.");
        sb.AppendLine("4) References to other files/symbols.\n");

        sb.AppendLine("Return only JSON with keys: summary, responsibilities, docstring, references.");
        return sb.ToString();
    }
}
