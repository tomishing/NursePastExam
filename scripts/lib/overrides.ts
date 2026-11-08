// Hand-set values that the notes cannot express (data_format.md section 1).

/**
 * Number of choices drawn inside the image for figure-choice questions
 * (Choices is 図の選択肢 or empty). Checked by looking at each image.
 * The import fails if a figure-choice row is missing here, or if a listed
 * card's Choices cell is not a figure-choice cell.
 */
export const figureChoiceCounts: Readonly<Record<string, number>> = {
  "nurse-100-PM-1": 4, // 100PM01.png: four population pyramids
  "nurse-103-AM-18": 4, // 103AM18.png: four hazard symbols
  "nurse-103add-PM-1": 4, // 103addPM01.png: four population pyramids
  "ph-108-PM-7": 4, // 108PM07.png: four bar charts of 受療率
};
