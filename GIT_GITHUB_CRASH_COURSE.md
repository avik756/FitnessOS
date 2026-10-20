# A Git, GitHub, and development crash course for this project

**Starting point (20 October 2026):** This folder is `C:\FitnessOS` in Windows and `/mnt/c/FitnessOS` in Ubuntu WSL. Ubuntu WSL 2, Git, and Python 3 are installed. The folder is already a Git repository on `main`, but it has **no commits and no GitHub remote**. It contains planning documents, a README, and this course. There is no app yet.

**Outcome:** Make one honest first commit, connect **Git in Ubuntu WSL** to your GitHub account, push that commit, and be able to repeat the workflow. You do not need Docker to do this.

Work through one box at a time. Type commands in an **Ubuntu WSL terminal**, unless a step says to use your browser. The `$` sometimes shown in online examples represents the prompt; do not type it. If a command fails, stop at that command, read the error, and ask for help with the exact command and error. Do not solve an unfamiliar Git error with `--force`, `reset --hard`, or by deleting `.git`.

## Your mental map (5 minutes)

```text
files in your folder → staging area → local commit → GitHub repository
                       git add       git commit     git push
```

- **Git** records versions of files on your computer. A **commit** is one named snapshot.
- **GitHub** is a website that can host a copy of those commits. It is not Git itself.
- A **repository** (repo) is a project folder with Git history. This folder already has `.git`, so do **not** run `git init` again.
- **Staging** means choosing exactly what goes into the next commit. `git add` stages; it does not upload.
- A **remote** is the saved address of a repository elsewhere. `origin` is the conventional nickname for the GitHub copy.
- A **branch** is a line of commits. This repo's branch is `main`.
- `push` sends local commits to GitHub. `pull` brings remote commits into your local branch. Neither happens automatically when you save a file.

**Say it aloud:** “I edit a file, inspect it, stage it, commit it locally, then push it to GitHub.” If you can explain that sentence, the rest is repetition.

## Session 1 — Find your feet in WSL (15–20 minutes)

### 1. Get to this exact folder

Open Ubuntu WSL and type these one at a time:

```bash
cd /mnt/c/FitnessOS
pwd
ls -la
git status
```

`cd` means **change directory**. `pwd` prints your current directory. `ls -la` lists files, including hidden ones such as `.git`. `git status` tells you which branch you are on and which files have changed. You should see `/mnt/c/FitnessOS` from `pwd`, `main` from Git, and several **untracked** files. `??` in the short form of status means “Git has not started tracking this file.”

**Do it:** Close the terminal, open a new Ubuntu terminal, return to this folder without copying the path from above, and run `git status` again. If you land in the wrong folder, `pwd` will reveal it.

### 2. Set the author of your local commits

Type the next two commands, replacing the email with an address you want associated with your commits. You can use a [GitHub no-reply email](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address) if you prefer not to expose your personal email in public commits.

```bash
git config --global user.name "Avik Bhargava"
git config --global user.email "YOUR_COMMIT_EMAIL"
git config --global user.name
git config --global user.email
```

`config` changes a Git setting. `--global` means this Ubuntu user's default for all repos, not a change to the project files. This is the **commit author**, not your GitHub login. Your Windows Git settings may be different; that is okay. Check that the displayed name and email are what you intended.

### 3. Inspect the first upload

The initial upload should be small and truthful. `README.md` says the app is in planning. `GIT_GITHUB_CRASH_COURSE.md` is this guide. `.gitignore` lists local files Git should skip, such as `.venv`, `.env`, and local databases. **Do not use `git add .` for this first commit**: the other planning files contain personal notes you should review before publishing.

Type:

```bash
git add README.md GIT_GITHUB_CRASH_COURSE.md .gitignore
git status
git diff --cached --stat
```

`git diff --cached` shows what is **staged** for the next commit. `--stat` gives a short file summary. The three named files should be staged; the other documents should still be untracked. If you accidentally stage a file, use `git restore --staged FILENAME` to unstage it. That does not delete the file.

**Do it:** Run `git diff --cached` without `--stat`. Scan the content you are about to publish. Explain to yourself why the planning documents are not in this snapshot.

### 4. Make a local commit

Type:

```bash
git commit -m "Document project starting point"
git log -1 --oneline
git status
```

`-m` supplies a short **message** naming what changed. `git log -1 --oneline` shows the latest commit in one line. This commit exists only on your computer until you push it.

**Checkpoint:** You can point to a commit ID and explain which three files it contains. If `git commit` says your identity is unknown, revisit step 2.

## Session 2 — Connect Ubuntu WSL Git to GitHub (25–40 minutes)

We will use **SSH**. SSH lets GitHub recognize a key held by your Ubuntu environment. You upload the **public** half to GitHub. The **private** half stays on your machine. Never paste, upload, or commit the private key. Windows and Ubuntu can have separate keys; set this up **inside Ubuntu WSL**, where you will run Git.

### 5. Check whether Ubuntu already has a key

```bash
ls -la ~/.ssh
```

`~` means your Ubuntu home directory. Look for `id_ed25519` and `id_ed25519.pub`. `.pub` is the public half. If the folder does not exist, or no suitable pair exists, create one:

```bash
ssh-keygen -t ed25519 -C "YOUR_GITHUB_EMAIL"
```

`ssh-keygen` creates a key pair. `-t ed25519` selects the key type. `-C` adds a human-readable comment; the email is a label, not your password. Press Enter for the default file location **only if it will not overwrite an existing key**. Choose a passphrase you can remember when prompted. Typing a passphrase may show no characters on screen; that is normal.

If you already had a suitable key, keep it and skip key generation. GitHub's [check existing keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/checking-for-existing-ssh-keys) and [generate a key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) guides cover unusual cases.

### 6. Load the key and add its public half to GitHub

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

`ssh-agent` holds an unlocked key for your current session; `ssh-add` loads it. `cat` prints the **public** key. If your key has a different filename, substitute it in the last two commands. Copy the full single line printed by `cat`.

In your browser, sign in to GitHub. Go to **profile picture → Settings → SSH and GPG keys → New SSH key**. Give it a title such as “Ubuntu WSL on my laptop”, select an **authentication** key, paste the public key, and save. [GitHub's add-key guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account) shows the current screens. You may need to start `ssh-agent` and run `ssh-add` again after opening a new terminal.

### 7. Test authentication

Back in **Ubuntu WSL**, type:

```bash
ssh -T git@github.com
```

The first connection may ask you to verify GitHub's host fingerprint. Compare it with [GitHub's published fingerprints](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints) before answering `yes`. A successful message starts `Hi YOUR_USERNAME!` and says GitHub does not provide shell access. That final sentence is expected; [GitHub's test guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection) explains it. If you get `Permission denied (publickey)`, check that you uploaded the `.pub` key from **this Ubuntu environment** and that `ssh-add` loaded its matching private key.

**Checkpoint:** You can say what the public key does and where the private key lives. You have connected this Ubuntu terminal to your GitHub account, but this project has not been linked to a GitHub repo yet.

## Session 3 — Give this project a GitHub address (15–25 minutes)

### 8. Create an empty repo on GitHub

In the browser, use **GitHub → New repository**. Pick a name such as `fitness-app` or `FitnessOS`. Choose **Private** for the first upload if you have not yet reviewed the personal planning notes. A private repo needs an invitation before Raghav can view it; a public repo can be viewed through its link. Leave GitHub's **README, `.gitignore`, and license** creation options unchecked, because you already have a local Git history. [GitHub's creation guide](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository) explains these options.

Copy the new repository's **SSH** URL. It will look like `git@github.com:YOUR_USERNAME/YOUR_REPO.git`. Do not type the example literally.

### 9. Attach the remote and push

In Ubuntu WSL, return to `/mnt/c/FitnessOS`. First check your situation:

```bash
pwd
git remote -v
git log -1 --oneline
```

If `git remote -v` is empty and you can see your commit, add the URL you copied:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git remote -v
git push -u origin main
```

Replace the example URL. `remote add origin` saves the GitHub address; it does not upload. `push` uploads commits. `-u` sets the **upstream**, so a later `git push` knows that local `main` goes to `origin/main`.

**Do it:** Open the GitHub repo in your browser. Find the commit message and open `README.md`. The page is your proof that the push worked. Copy the repository's web URL for your check-in.

If Git says `remote origin already exists`, inspect `git remote -v` instead of adding another. If Git says `src refspec main does not match any`, check that session 1 produced a commit on `main`. If authentication fails, return to step 7.

## Session 4 — Repeat without a recipe (20 minutes)

You now know the full loop. This time, use the commands you learned without looking at the answers until you are stuck:

1. Edit `README.md`. Add one sentence under “First development milestone” explaining what **you** want to try first.
2. Ask Git which files changed.
3. Inspect the change.
4. Stage **only** `README.md`.
5. Make a commit with a message that describes your change.
6. Push it.
7. Refresh GitHub and find the second commit.

Useful clues: `git status`, `git diff`, `git add README.md`, `git diff --cached`, `git commit -m "..."`, `git push`, `git log --oneline -3`. The goal is to understand the path of **your** sentence from a local file to GitHub, not to memorize every Git command.

**Confidence test:** Close your terminal. Tomorrow, open Ubuntu, find the project, make a one-line edit, and repeat the loop. If you can do that with a quick glance at this guide, Git is already working for you.

## What to say in a 10–15 minute check-in

Be direct about the stage of the work. You can say:

> “The project is currently in requirements and architecture discovery. I have the first scope written down, set up Git from WSL, and pushed an initial repository. My next milestone is one small strength-logging flow that saves a set and shows it in history. I would value feedback on whether that is the right first slice and how to show useful weekly progress in GitHub.”

If you have not completed a step, change the sentence to the truth. The check-in explicitly invites blockers. Useful blockers to mention are **which command**, **what you expected**, and **what happened**. “GitHub is confusing” is understandable; “SSH authentication succeeds, but `git push` says `Repository not found`” is actionable.

Your existing reply gives a clear Friday window. Send the repo URL when you have verified it in the browser. If the repo is private, [invite Raghav as a collaborator](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository) so he can open it.

## Technology map: what is likely, and when

| Tool or technology | What it does | When to learn it |
| --- | --- | --- |
| Ubuntu WSL + terminal | Runs Linux commands on your Windows computer | **Now:** navigate, inspect files, run Git |
| Git + GitHub + SSH | Versions, shares, and authenticates your work | **Now:** the four sessions above |
| Editor (your preferred one) | Changes project files | **Now:** edit and inspect a small diff |
| Python 3 | Likely server and data logic, given your Python preference | **Next:** build the first slice |
| `venv` + `pip` | Gives each Python project its own installed packages | **When the first dependency is needed** |
| HTML + CSS + small amounts of JavaScript | Creates the phone-sized browser interface | **Next:** build the first slice |
| SQLite | Stores workouts locally in a structured file | **Next:** save and read one set |
| Web framework, possibly FastAPI | Connects browser requests to Python logic | **After choosing the first slice's shape:** this is a candidate, not a locked decision |
| `pytest` | Checks important Python behavior automatically | **With the first save/read logic** |
| PWA features | May help a web app launch and work on a phone | **After the basic phone flow works** |
| Docker | Packages an app and its runtime for repeatable environments or deployment | **Later, if deployment actually needs it** |

Three names that sound similar but do different jobs: **`venv`** is a Python package environment; **`.env`** is often a file of machine-specific configuration values; **Docker** packages a broader runtime in a container. None is required to make the first Git commit or push. A `.env` file should stay out of Git because it may hold secrets.

The product's web-first direction is still being explored. Do not lock React, a cloud database, Docker, or a hosting service merely to produce a GitHub link. [Microsoft recommends keeping files in WSL's Linux filesystem when you do most development with Linux tools](https://learn.microsoft.com/en-us/windows/wsl/interop); `/mnt/c/FitnessOS` is fine for this small Git exercise, but consider moving or cloning the project under your Ubuntu home directory before a dependency-heavy build.

## The first development task after the push

Make one complete, tiny **logging → saved data → history** flow. An example acceptance check is: enter an exercise name, reps, and load; save; close and restart the app; find exactly the same entry in history. Try it at phone width. This is a better demonstration of progress than installing many technologies. Keep it a prototype, and do not use it as your only copy of real workout records yet.

Write down these four answers before coding:

1. Which three fields must a set have for this experiment?
2. What visible message proves a save succeeded?
3. How will you prove the data survived a restart?
4. What is the simplest way to show the history on a phone screen?

Then implement only that path. A useful commit sequence could be “Add one-set entry page”, “Save sets in SQLite”, and “Show saved sets in history”. Each commit should describe a real change you can demonstrate. If you want help, ask for **one** of those steps at a time and have the helper explain the diff.

## If you get stuck

Copy the command you typed, its complete error, and the output of `pwd`, `git status`, and `git remote -v` (if relevant). Do **not** share private key contents, passwords, or tokens. You can ask: “Explain this error, the smallest safe next step, and why it works.”

Reference: [GitHub's introduction to Git](https://docs.github.com/en/get-started/using-git/about-git), [GitHub's remote guide](https://docs.github.com/en/get-started/git-basics/managing-remote-repositories), and [GitHub's SSH guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh).
