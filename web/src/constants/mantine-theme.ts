"use client";
import { MantineThemeOverride } from "@mantine/core";

const DEFAULT_FONT = "__gameria_d00d44', '__gameria_Fallback_d00d44";

const configTheme: MantineThemeOverride = {
  fontFamily: DEFAULT_FONT,
  // focusRingStyles: {
  //   inputStyles: () => ({
  //     outline: "1px solid #75BFFF",
  //     borderColor: "#75BFFF",
  //     boxSizing: `border-box`,
  //   }),
  // },
};

export default configTheme;
