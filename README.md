# BVM - Bun Version Manager

**BVM** is a simple and fast CLI tool to manage multiple versions of [Bun](https://bun.sh), the all-in-one JavaScript runtime. Inspired by tools like `nvm` and `rvm`, BVM lets you easily install, switch, and manage different Bun versions.

> ⚠️ Currently in active development – contributions and feedback are welcome!

---

## 🚀 Features

- 📥 Install any version of Bun
- 🔁 Switch between installed versions
- 📦 Uninstall versions you no longer need
- 📃 List installed and remote Bun versions
- 🧠 Lightweight and fast – built with Node.js and TypeScript

---

## 📦 Installation

> **Coming soon to npm – for now, clone & link locally:**

```bash
git clone https://github.com/MrHacker26/bvm.git
cd bvm
pnpm install
pnpm build
pnpm link
```

## 🛠️ Usage

Once installed, you can use `bvm` from anywhere in your terminal:

```bash
bvm install <version>     # Install a specific Bun version
bvm use <version>         # Set a specific Bun version as active
bvm uninstall <version>   # Remove an installed version
bvm list                  # List installed Bun versions
bvm remote                # List available remote Bun versions
```

## 📌 Examples

```bash
bvm install 1.0.12
bvm use 1.0.12
bvm list
bvm uninstall 1.0.11
```
