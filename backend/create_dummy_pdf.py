import fitz

doc = fitz.open()
page = doc.new_page()
rect = fitz.Rect(50, 50, 400, 200)
page.insert_textbox(rect, "Monday\nData Structures\n9:00 AM\n10:00 AM\nCS-101\nDr. Smith")
doc.save("test_timetable.pdf")
doc.close()
print("test_timetable.pdf generated successfully.")
