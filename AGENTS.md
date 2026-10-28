<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Game architecture
- Keep campaign definitions and turn resolution in client-safe `src/game` modules; only the AI narrator runs through the server-function boundary, so scene rendering never imports server-only code.
- Store a versioned campaign snapshot locally after committed turns and validate it before restoring, so interrupted AI requests cannot corrupt progress.
- Use shared Button pixel variants for game controls and global semantic tokens for the illustrated pixel-art interface.
