# Diffusion-Grid Text Animation Generator

Generate mesmerizing intro animations where text emerges from chaos through character diffusion. Perfect for personal branding, GitHub profiles, or any project needing a unique animated introduction.

## ✨ Features

**Core Animation**
- **Diffusion Effect**: Characters cycle through random ASCII/Unicode until converging on target text
- **Multi-line Support**: Seamlessly cycles through multiple text lines
- **Convergence Effects**: Highlight or underline characters as they lock in
- **3D Grid Background**: Animated perspective grid with customizable speed and density

**Customization**
- **Timing Controls**: Adjust speed, convergence delay, hold duration, and diffuse-out speed
- **Visual Options**: 8 font families, adjustable size, custom accent colors
- **Theme Support**: Light/dark mode toggle
- **Flexible Sizing**: Customizable animation dimensions (200-1200px width)

**Export**
- **WebM/MP4 Export**: High-quality video generation with progress tracking
- **Full Cycle Recording**: Automatically captures complete animation loops

## 🚀 Quick Start

1. **Open `index.html`** in your browser
2. **Enter your text** in the text area (one line per line)
3. **Adjust settings** using the control panels
4. **Click ▶️ Start** to begin animation
5. **Export** your animation as WebM/MP4

## ⚙️ Controls

### Animation Settings
- **Dimensions**: Set custom width (200-1200px) and height (200-800px)

### Timing
- **Speed**: Animation playback rate (1-10)
- **Convergence Delay**: Stagger character convergence (0-500ms)
- **Hold Duration**: How long text stays converged (1-5 seconds)
- **Diffuse Out Speed**: Rate of text dissolution (1-10)

### Visual Style
- **Fonts**: Courier New, SF Mono, Fira Code, JetBrains Mono, and more
- **Convergence Effects**: Highlight, underline, or none
- **Accent Color**: Customize convergence highlight color
- **Grid Background**: Adjustable speed, density, and color

### Quick Actions
- **🔄 Reset**: Restart current animation
- **⚡ Randomize**: Shuffle all settings
- **🌓 Theme**: Toggle light/dark mode
- **📥 Export**: Generate video file

## 🛠️ Technical Details

- **Pure JavaScript**: No external dependencies
- **Canvas-based Export**: High-quality video generation
- **Responsive Design**: Adapts to different screen sizes
- **MediaRecorder API**: Browser-native video encoding

## 📝 Usage Examples

**Personal Intro**
```
Your Name
Software Engineer
GitHub: @username
```

**Project Showcase**
```
Project Name
Next.js • TypeScript
Live Demo Available
```

**Brand Identity**
```
Company Name
Innovation Through Code
Est. 2024
```

## 🎨 Customization Tips

- **Monospace fonts** work best for clean convergence
- **Shorter text** creates more dramatic effects
- **Higher convergence delay** adds more chaos before convergence
- **Grid density 20-35** provides optimal visual balance

## 📱 Browser Support

Works in all modern browsers supporting:
- Canvas API
- MediaRecorder API
- CSS Grid/Flexbox

## 📄 License

MIT License - Feel free to use for personal or commercial projects.
