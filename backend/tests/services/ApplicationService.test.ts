import ApplicationService from "src/services/ApplicationService";

import type { Quarter } from "src/services/ApplicationService";

describe("applicationService tests", () => {
  describe("determineApplicantGradeLevel", () => {
    const CURRENT_YEAR = 2025;

    const expectGradeLevel = (
      startQuarter: Quarter,
      startYear: number,
      gradQuarter: Quarter,
      gradYear: number,
      expectedYear: number,
    ) => {
      const absoluteStart = ApplicationService.calculateQuarter(startQuarter, startYear);
      const absoluteGrad = ApplicationService.calculateQuarter(gradQuarter, gradYear);
      const result = ApplicationService.determineApplicantGradeLevel(
        absoluteStart,
        absoluteGrad,
        CURRENT_YEAR,
      );
      expect(result).toBe(expectedYear);
    };

    describe("1st year", () => {
      it("traditional degree timeline", () => {
        expectGradeLevel("Fall", 2025, "Spring", 2029, 1);
      });

      it("graduates in winter", () => {
        expectGradeLevel("Fall", 2025, "Winter", 2029, 1);
      });

      it("graduates in fall", () => {
        expectGradeLevel("Fall", 2025, "Fall", 2028, 1);
      });

      it("graduates a year early", () => {
        expectGradeLevel("Fall", 2025, "Spring", 2028, 1);
      });

      it("graduates in winter a year early", () => {
        expectGradeLevel("Fall", 2025, "Winter", 2028, 1);
      });

      it("graduates in fall a year early", () => {
        expectGradeLevel("Fall", 2025, "Fall", 2027, 1);
      });
    });

    describe("2nd year", () => {
      it("traditional degree timeline", () => {
        expectGradeLevel("Fall", 2024, "Spring", 2028, 2);
      });

      it("graduates in winter", () => {
        expectGradeLevel("Fall", 2024, "Winter", 2028, 2);
      });

      it("graduates in fall", () => {
        expectGradeLevel("Fall", 2024, "Fall", 2027, 2);
      });

      it("graduates a year early", () => {
        expectGradeLevel("Fall", 2024, "Spring", 2027, 2);
      });

      it("graduates in winter a year early", () => {
        expectGradeLevel("Fall", 2024, "Winter", 2027, 2);
      });

      it("graduates in fall a year early", () => {
        expectGradeLevel("Fall", 2024, "Fall", 2026, 2);
      });
    });

    describe("3rd year", () => {
      it("traditional degree timeline", () => {
        expectGradeLevel("Fall", 2023, "Spring", 2027, 3);
      });

      it("graduates in winter", () => {
        expectGradeLevel("Fall", 2023, "Winter", 2027, 3);
      });

      it("graduates in fall", () => {
        expectGradeLevel("Fall", 2023, "Fall", 2026, 3);
      });

      it("graduates a year early", () => {
        expectGradeLevel("Fall", 2023, "Spring", 2026, 3);
      });

      it("graduates in winter a year early", () => {
        expectGradeLevel("Fall", 2023, "Winter", 2026, 3);
      });

      it("graduates in fall a year early", () => {
        expectGradeLevel("Fall", 2023, "Fall", 2025, 3);
      });
    });

    describe("4th year", () => {
      it("traditional degree timeline", () => {
        expectGradeLevel("Fall", 2022, "Spring", 2026, 4);
      });

      it("graduates in winter", () => {
        expectGradeLevel("Fall", 2022, "Winter", 2026, 4);
      });

      it("graduates in fall", () => {
        expectGradeLevel("Fall", 2022, "Fall", 2025, 4);
      });
    });

    describe("1st year transfer", () => {
      it("traditional degree timeline", () => {
        expectGradeLevel("Fall", 2025, "Spring", 2027, 3);
      });

      it("graduates in winter", () => {
        expectGradeLevel("Fall", 2025, "Winter", 2027, 3);
      });

      it("graduates in fall", () => {
        expectGradeLevel("Fall", 2025, "Fall", 2026, 3);
      });

      it("graduates a year early", () => {
        expectGradeLevel("Fall", 2025, "Spring", 2026, 3);
      });

      it("graduates in winter a year early", () => {
        expectGradeLevel("Fall", 2025, "Winter", 2026, 3);
      });

      it("graduates in fall a year early", () => {
        expectGradeLevel("Fall", 2025, "Fall", 2025, 3);
      });
    });

    describe("2nd year transfer", () => {
      it("traditional degree timeline", () => {
        expectGradeLevel("Fall", 2024, "Spring", 2026, 4);
      });

      it("graduates in winter", () => {
        expectGradeLevel("Fall", 2024, "Winter", 2026, 4);
      });

      it("graduates in fall", () => {
        expectGradeLevel("Fall", 2024, "Fall", 2025, 4);
      });
    });
  });
});
