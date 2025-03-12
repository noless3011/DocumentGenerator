# DocumentGenerator

A comprehensive tool for automatically generating technical documentation, UML diagrams, and system specifications from Excel spreadsheets and UI screenshots.

## Overview

DocumentGenerator is a cross-platform desktop application that combines an Electron-based GUI with a powerful Python backend to transform structured data and UI screenshots into detailed documentation, including:

- Technical documentation in Markdown format
- Class diagrams
- Database schema diagrams
- Use case diagrams
- Activity diagrams

The application leverages Gemini AI to analyze input data and generate human-readable documentation with minimal user effort.

## Features

- **Excel File Processing**: Upload and analyze Excel spreadsheets
- **Sheet Selection**: Choose which sheets to process and what type of output to generate
- **Document Generation**: Create comprehensive documentation using both structured data and UI screenshots
- **Diagram Generation**: Automatically create various UML diagrams from your data
- **Preview Capability**: Preview Excel data before processing
- **Custom Output Location**: Specify where to save generated documents

## System Architecture

- **DGUI**: Electron-based frontend with React and TypeScript
- **FileHandling**: Python backend with Flask API for file processing and AI integration
- **Integration**: Communication between frontend and backend via HTTP API

## Installation

### Prerequisites

- Node.js (v14+)
- Python 3.9+
- Gemini API key

### Setup

1. **Clone the repository**

   ```
   git clone https://github.com/yourusername/DocumentGenerator.git
   cd DocumentGenerator
   ```

2. **Install frontend dependencies**

   ```
   cd DGUI
   npm install
   ```

3. **Install backend dependencies**

   ```
   cd ../FileHandling
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Set up API key**
   - Create a `.env` file in the FileHandling directory
   - Add your Gemini API key: `GEMINI_API_KEY=your_api_key_here`

## Usage

1. **Start the backend server**

   ```
   cd FileHandling
   python FileHandling.py
   ```

2. **Launch the application**

   ```
   cd ../DGUI
   npm start
   ```

3. **Using the application**
   - Click "Select File" to upload an Excel file
   - Choose which sheets to process
   - Select output types for each sheet (UI, Table, Diagram)
   - Click "Process Selected Sheets" to analyze the data
   - Select an output folder if desired
   - Click "Generate Documents" to create documentation
   - View results in the Results tab

## Project Structure

```
DocumentGenerator/
├── data/                     # Input data (images and CSV files)
├── output/                   # Default location for generated output
├── DGUI/                     # Electron frontend application
│   ├── src/                  # Source code for the GUI
│   ├── outputs/              # Generated outputs from the GUI
│   └── .webpack/             # Webpack build files
└── FileHandling/             # Python backend
    ├── DocumentGeneration.py # Core document generation logic
    ├── FileHandling.py       # Flask API and file handling
    ├── output/               # Backend output directory
    └── uploads/              # Temporary storage for uploaded files
```

## Development

- Frontend development: `cd DGUI && npm run dev`
- Backend development: `cd FileHandling && python FileHandling.py`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Acknowledgments

- Electron.js for the cross-platform desktop application framework
- React for the user interface
- Gemini AI for powering the document generation
- Flask for the lightweight API backend

---

For any questions or issues, please open an issue on the GitHub repository.

Similar code found with 2 license types
