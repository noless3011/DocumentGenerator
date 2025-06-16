import os
import csv
import io
import time
import win32com.client
import pythoncom
from PIL import ImageGrab
from typing import List, Dict, Union, Optional

class ExcelFileHandler:
    """Handles Excel file operations with persistent Excel application process."""

    def __init__(self):
        """Initialize with persistent Excel application."""
        pythoncom.CoInitialize()
        self.excel = None
        self._initialize_excel()

    def _initialize_excel(self):
        """Initialize the Excel application."""
        try:
            self.excel = win32com.client.Dispatch("Excel.Application")
            self.excel.Visible = False
            self.excel.DisplayAlerts = False
        except Exception as e:
            print(f"Error initializing Excel: {e}")
            self.excel = None

    def __del__(self):
        """Cleanup when object is destroyed."""
        self.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()

    def close(self):
        """Explicitly close Excel application and cleanup COM."""
        if self.excel:
            try:
                # Close all open workbooks first
                for workbook in self.excel.Workbooks:
                    workbook.Close(SaveChanges=False)
                self.excel.Quit()
            except Exception as e:
                print(f"Error closing Excel: {e}")
            finally:
                self.excel = None
        
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass  # CoUninitialize might fail if already called

    def _ensure_excel_ready(self) -> bool:
        """Ensure Excel application is ready for use."""
        if not self.excel:
            self._initialize_excel()
        return self.excel is not None

    def get_sheet_names(self, excel_file_path: str) -> Union[List[str], Dict[str, str]]:
        """Gets all sheet names from an Excel file."""
        print(f"Checking excel_file_path: {excel_file_path}")
        if not os.path.exists(excel_file_path):
            return {"error": f"Excel file not found: {excel_file_path}"}

        if not self._ensure_excel_ready():
            return {"error": "Failed to initialize Excel application"}

        workbook = None
        try:
            workbook = self.excel.Workbooks.Open(excel_file_path)
            sheet_names = [sheet.Name for sheet in workbook.Sheets]
            return sheet_names
        except Exception as e:
            return {"error": str(e)}
        finally:
            if workbook:
                workbook.Close(SaveChanges=False)

    def _process_text_table(self, worksheet: win32com.client.CDispatch) -> str:
        """Processes a worksheet as a text table and returns CSV data."""
        used_range = worksheet.UsedRange
        output = io.StringIO()
        csv_writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)  
        for row in range(1, used_range.Rows.Count + 1):
            row_data = []
            for col in range(1, used_range.Columns.Count + 1):
                cell_value = used_range.Cells(row, col).Value
                if cell_value is None:
                    row_data.append("")
                elif isinstance(cell_value, str):
                    row_data.append(cell_value.encode('utf-8', errors='ignore').decode('utf-8'))
                else:
                    row_data.append(str(cell_value)) 
            csv_writer.writerow(row_data)
        return output.getvalue()

    def _save_sheet_as_image(self, worksheet: win32com.client.CDispatch, output_path: str) -> bool:
        """Saves a worksheet as an image."""
        try:
            used_range = worksheet.UsedRange
            used_range.Copy()
            time.sleep(0.5)  # Small delay to ensure clipboard is ready
            image = ImageGrab.grabclipboard()
            if image:
                image.save(output_path, "PNG")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error saving image: {e}")
            return False

    def process_sheets(self, excel_file_path: str, output_folder: str, sheet_types: Dict[str, str]) -> Dict[str, Dict[str, str]]:
        """
        Processes specified sheets in an Excel file and converts them to different output formats.
        This method opens an Excel workbook, processes each specified sheet according to its type,
        and saves the output to the designated folder. It supports two sheet types: 'table' for
        CSV export and 'ui' for image export.
        Args:
            excel_file_path (str): The full path to the Excel file to be processed.
            output_folder (str): The directory path where output files will be saved.
            sheet_types (Dict[str, str]): A dictionary mapping sheet names to their processing types.
                Valid types are:
                - 'table': Exports sheet data as CSV file
                - 'ui': Exports sheet as PNG image file
        Returns:
            Dict[str, Dict[str, str]]: A nested dictionary containing processing results for each sheet.
                Structure:
                {
                    "sheet_name": {
                        "status": "success" | "error",
                        "type": "table" | "ui",  # Only present on success
                        "output_path": "path/to/output/file",  # Only present on success
                        "message": "error description"  # Only present on error
                    }
                }
                On critical failure (file not found, Excel initialization failure, or workbook open error):
                {
                    "error": "error description"
                }
        """
        if not os.path.exists(excel_file_path):
            return {"error": f"Excel file not found: {excel_file_path}"}

        if not self._ensure_excel_ready():
            return {"error": "Failed to initialize Excel application"}

        workbook = None
        result: Dict[str, Dict[str, str]] = {}

        try:
            workbook = self.excel.Workbooks.Open(excel_file_path)
            sheet_names = [sheet.Name for sheet in workbook.Sheets]

            for sheet_name, sheet_type in sheet_types.items():
                if sheet_name not in sheet_names:
                    result[sheet_name] = {
                        "status": "error",
                        "message": f"Sheet '{sheet_name}' not found in the Excel file."
                    }
                    continue

                try:
                    worksheet = workbook.Sheets(sheet_name)

                    if sheet_type.lower() == 'table':
                        csv_data = self._process_text_table(worksheet)
                        output_path = os.path.join(output_folder, f"{sheet_name}.csv")
                        with open(output_path, 'w', newline='', encoding='utf-8') as csv_file:
                            csv_file.write(csv_data)
                        result[sheet_name] = {
                            "status": "success",
                            "type": "table",
                            "output_path": output_path
                        }
                    elif sheet_type.lower() == 'ui':
                        output_path = os.path.join(output_folder, f"{sheet_name}.png")
                        success = self._save_sheet_as_image(worksheet, output_path)
                        if success:
                            result[sheet_name] = {
                                "status": "success",
                                "type": "ui",
                                "output_path": output_path
                            }
                        else:
                            result[sheet_name] = {
                                "status": "error",
                                "message": "Failed to save sheet as image"
                            }
                    else:
                        result[sheet_name] = {
                            "status": "error",
                            "message": f"Unknown sheet type '{sheet_type}'. Use 'ui' or 'table'."
                        }
                except Exception as e:
                    result[sheet_name] = {
                        "status": "error",
                        "message": str(e)
                    }

        except Exception as e:
            return {"error": str(e)}
        finally:
            if workbook:
                workbook.Close(SaveChanges=False)

        return result

    def get_sheet_preview_data(self, excel_file_path: str, sheet_name: str, max_rows: int = 100) -> Dict:
        """Gets preview data from a specific sheet in an Excel file.
        
        Args:
            excel_file_path: Path to the Excel file
            sheet_name: Name of the sheet to preview
            max_rows: Maximum number of rows to return (default: 100)
            
        Returns:
            Dict with 'headers' and 'data' keys, or 'error' key if failed
        """
        if not os.path.exists(excel_file_path):
            return {"error": f"Excel file not found: {excel_file_path}"}

        if not self._ensure_excel_ready():
            return {"error": "Failed to initialize Excel application"}

        workbook = None
        
        try:
            workbook = self.excel.Workbooks.Open(excel_file_path)
            
            # Check if sheet exists
            sheet_names = [sheet.Name for sheet in workbook.Sheets]
            if sheet_name not in sheet_names:
                return {"error": f"Sheet '{sheet_name}' not found in file. Available sheets: {', '.join(sheet_names)}"}
            
            worksheet = workbook.Sheets(sheet_name)
            used_range = worksheet.UsedRange
            
            if not used_range:
                return {"headers": [], "data": []}
            
            # Get the actual row and column count
            rows_count = used_range.Rows.Count
            cols_count = used_range.Columns.Count
            
            # Limit rows for preview
            preview_rows = min(rows_count, max_rows)
            
            # Extract headers (first row)
            headers = []
            for col in range(1, cols_count + 1):
                cell_value = used_range.Cells(1, col).Value
                if cell_value is None:
                    headers.append(f"Column {col}")
                else:
                    headers.append(str(cell_value))
            
            # Extract data rows (skip header row if we have more than 1 row)
            data = []
            start_row = 2 if rows_count > 1 else 1
            
            for row in range(start_row, min(preview_rows + 1, rows_count + 1)):
                row_data = []
                for col in range(1, cols_count + 1):
                    cell_value = used_range.Cells(row, col).Value
                    if cell_value is None:
                        row_data.append("")
                    elif isinstance(cell_value, str):
                        row_data.append(cell_value.encode('utf-8', errors='ignore').decode('utf-8'))
                    else:
                        row_data.append(str(cell_value))
                data.append(row_data)
                
            return {"headers": headers, "data": data}
            
        except Exception as e:
            return {"error": f"Error reading sheet '{sheet_name}': {str(e)}"}
        finally:
            if workbook:
                workbook.Close(SaveChanges=False)