import os
import csv
import io
import time
import win32com.client
import pythoncom
from PIL import ImageGrab
from typing import List, Dict, Union, Optional

class ExcelFileHandler:
    """Handles Excel file operations."""

    def __init__(self):
        # Initialization is minimal; COM objects are created per-operation
        pass

    def get_sheet_names(self, excel_file_path: str) -> Union[List[str], Dict[str, str]]:
        """Gets all sheet names from an Excel file."""
        print(f"Checking excel_file_path: {excel_file_path}")
        if not os.path.exists(excel_file_path):
            return {"error": f"Excel file not found: {excel_file_path}"}

        pythoncom.CoInitialize()
        excel = None
        workbook = None
        try:
            excel = win32com.client.Dispatch("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            workbook = excel.Workbooks.Open(excel_file_path)
            sheet_names = [sheet.Name for sheet in workbook.Sheets]
            return sheet_names
        except Exception as e:
            return {"error": str(e)}
        finally:
            if workbook:
                workbook.Close(SaveChanges=False)
            if excel:
                excel.Quit()
            pythoncom.CoUninitialize()

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
            used_range.Copy() # Select is no longer needed.
            time.sleep(0.5)  # Small delay to ensure clipboard is ready
            image = ImageGrab.grabclipboard()
            if image:
                image.save(output_path, "PNG")  # Explicitly specify format
                return True
            else:
                return False
        except Exception as e:
            print(f"Error saving image: {e}") # More specific error logging
            return False


    def process_sheets(self, excel_file_path: str, output_folder: str, sheet_types: Dict[str, str]) -> Dict[str, Dict[str, str]]:
        """Processes specified sheets in the Excel file."""

        if not os.path.exists(excel_file_path):
            return {"error": f"Excel file not found: {excel_file_path}"}

        pythoncom.CoInitialize()
        excel = None
        workbook = None
        result: Dict[str, Dict[str, str]] = {}

        try:
            excel = win32com.client.Dispatch("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            workbook = excel.Workbooks.Open(excel_file_path)
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
                        with open(output_path, 'w', newline='', encoding='utf-8') as csv_file: # Changed to utf-8
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
            if excel:
                excel.Quit()
            pythoncom.CoUninitialize()

        return result