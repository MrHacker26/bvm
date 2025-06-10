# BVM - Bun Version Manager

**BVM** is a simple and fast CLI tool to manage multiple versions of [Bun](https://bun.sh), the all-in-one JavaScript runtime. Inspired by tools like `nvm` and `rvm`, BVM lets you easily install, switch, and manage different Bun versions.

---

## 🚀 Features

- 📥 Install any version of Bun
- 🔁 Switch between installed versions seamlessly
- 📦 Uninstall versions you no longer need
- 📃 List installed and remote Bun versions
- 🐚 Auto-configure shell environment (bash, zsh, fish)
- 🧠 Lightweight and fast – built with Node.js and TypeScript
- 🔗 Automatic symlink management for `bun` and `bunx`
- ✨ Command completions support

---

## 🖥️ Platform Support

| Platform | Status | Tested |
|----------|--------|---------|
| Linux    | ✅ Supported | ✅ Tested on Ubuntu/Debian |
| macOS    | ✅ Supported | ✅ Tested on M2 (Apple Silicon) |
| Windows  | ❓ Unknown | ❓ Not tested yet |

**Note**: BVM has been tested and works on Linux systems. macOS support should work but hasn't been tested yet. Windows support is planned but not implemented.

---

## 📦 Installation

### Install from npm 

```bash
# With npm
npm install -g bunvm

# With pnpm (recommended)
pnpm add -g bunvm

# With yarn
yarn global add bunvm

# With Bun
bun add -g bunvm
```

After installation, you can use the `bvm` command from anywhere in your terminal.

### Install from source

```bash
git clone https://github.com/MrHacker26/bvm.git
cd bvm
pnpm install
pnpm build
pnpm link
```

---

## 🛠️ Usage

Once installed, you can use `bvm` from anywhere in your terminal:

```bash
bvm install <version>     # Install a specific Bun version (alias: i)
bvm install latest        # Install the latest Bun version
bvm use <version>         # Set a specific Bun version as active
bvm uninstall <version>   # Remove an installed version (alias: u)
bvm list                  # List installed Bun versions (alias: ls)
bvm remote                # List available remote Bun versions (alias: r)
bvm --help                # Show help information
```

---

## 📌 Examples

```bash
# Install the latest Bun version
bvm install latest

# Install a specific Bun version
bvm install 1.0.12
# or use alias
bvm i 1.0.12

# Switch to a specific version
bvm use 1.0.12

# List all installed versions
bvm list
bvm ls              # or use alias

# See what versions are available remotely
bvm remote
bvm r               # or use alias

# Remove an old version
bvm uninstall 1.0.11
bvm u 1.0.11        # or use alias
```

---

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/MrHacker26/bvm.git
cd bvm

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link for local testing
pnpm link

# Run in development mode
pnpm dev
```

### Scripts

- `pnpm build` - Build the project with tsup
- `pnpm dev` - Run in development mode with tsx
- `pnpm clean` - Clean build directory
- `pnpm start` - Run the built CLI
- `pnpm format` - Format code with Prettier
- `pnpm lint` - Lint code with ESLint
- `pnpm lint:fix` - Fix linting issues

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. Areas where help is needed:

- Testing on macOS and Windows
- Additional shell support
- Bug fixes and improvements
- Documentation updates

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [nvm](https://github.com/nvm-sh/nvm) and [rvm](https://rvm.io/)
- Built for the amazing [Bun](https://bun.sh) runtime
- Thanks to the TypeScript and Node.js communities

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/MrHacker26/bvm/issues) page
2. Create a new issue with details about your environment
3. Include your platform, shell, and any error messages

**Happy Bunning! 🥖✨**