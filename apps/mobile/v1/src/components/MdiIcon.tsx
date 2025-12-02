import React from 'react';
import Svg, { Path } from 'react-native-svg';

// MDI icon paths (from @mdi/js) - hardcoded to avoid Node version issues
export const mdiTextBoxOutline = 'M5,3C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3H5M5,5H19V19H5V5M7,7V9H17V7H7M7,11V13H17V11H7M7,15V17H14V15H7Z';
export const mdiVectorSquare = 'M2,2H8V4H16V2H22V8H20V16H22V22H16V20H8V22H2V16H4V8H2V2M16,8V6H8V8H6V16H8V18H16V16H18V8H16M4,4V6H6V4H4M18,4V6H20V4H18M4,18V20H6V18H4M18,18V20H20V18H18Z';
export const mdiFileTableBoxOutline = 'M19 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.89 20.1 3 19 3M19 19H5V5H19V19M7 7H11V11H7V7M7 13H11V17H7V13M13 7H17V11H13V7M13 13H17V17H13V13Z';
export const mdiCodeTags = 'M14.6,16.6L19.2,12L14.6,7.4L16,6L22,12L16,18L14.6,16.6M9.4,16.6L4.8,12L9.4,7.4L8,6L2,12L8,18L9.4,16.6Z';
export const mdiFileDocumentOutline = 'M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z';

interface MdiIconProps {
  path: string;
  size?: number;
  color?: string;
}

/**
 * Renders MDI icons using react-native-svg
 * MDI icons use a 24x24 viewBox
 */
export function MdiIcon({ path, size = 24, color = '#000' }: MdiIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={path} fill={color} />
    </Svg>
  );
}

export default MdiIcon;
