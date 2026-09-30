export function ChessPiece({ color, type }: { color: "w" | "b"; type: string }) {
  const isWhite = color === "w";
  const fill = isWhite ? "#FFFFFF" : "#1B2228";
  const stroke = isWhite ? "#1E252B" : "#0A0D10";
  const detail = isWhite ? "#1E252B" : "#CFD8DC";

  switch (type) {
    case "p":
      return (
        <svg className="svg-piece" viewBox="0 0 45 45" aria-hidden="true">
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill={fill}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {!isWhite && (
            <path
              d="M 16,36 C 18,34.5 27,34.5 29,36"
              fill="none"
              stroke={detail}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}
        </svg>
      );

    case "r":
      return (
        <svg className="svg-piece" viewBox="0 0 45 45" aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 z" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 z" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" />
            <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
            <path d="M 11,14 L 34,14" fill="none" />
          </g>
          {!isWhite && (
            <path
              d="M 14,34 L 31,34 M 14,17 L 31,17"
              fill="none"
              stroke={detail}
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          )}
        </svg>
      );

    case "n":
      return (
        <svg className="svg-piece" viewBox="0 0 45 45" aria-hidden="true">
          <g fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
              fill={fill}
              stroke={stroke}
            />
            <path
              d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,7.4 17.03,5.64 21,5.5 C 22,5.5 22,6.5 22,6.5 C 22,6.5 22.5,7 22,7.5 C 21.5,8 21,8.5 21,9 C 21,9.5 21.5,10 22,10 z"
              fill={fill}
              stroke={stroke}
            />
            <circle cx="9" cy="25.5" r="0.8" fill={detail} stroke={detail} />
            <path
              d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
              transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
              fill={detail}
              stroke={detail}
            />
            {!isWhite && (
              <path
                d="M 24.55,10.4 C 24.19,10 23.4,9.5 22,10 C 21,10.5 21,11.5 21.5,12 C 22,12.5 23,12.5 23.5,12 C 24,11.5 24.9,10.8 24.55,10.4 z"
                fill={detail}
                stroke={detail}
              />
            )}
          </g>
        </svg>
      );

    case "b":
      return (
        <svg className="svg-piece" viewBox="0 0 45 45" aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.646,38.99 6.677,38.97 6,38 C 7.354,36.54 9,36 9,36 z" />
            <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
            <circle cx="22.5" cy="8" r="2.5" />
          </g>
          <path
            d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"
            fill="none"
            stroke={detail}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "q":
      return (
        <svg className="svg-piece" viewBox="0 0 45 45" aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 22.5,10 L 14,25 L 6.5,13.5 z" />
            <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 9,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 z" />
          </g>
          <path
            d="M 11.5,30 C 15,29 30,29 33.5,30 M 12,33.5 C 18,32.5 27,32.5 33,33.5"
            fill="none"
            stroke={detail}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "k":
      return (
        <svg className="svg-piece" viewBox="0 0 45 45" aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6" stroke={detail} strokeWidth="1.5" />
            <path d="M 20,8 L 25,8" stroke={detail} strokeWidth="1.5" />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
            <path d="M 11.5,37 C 17,40.5 28,40.5 33.5,37 C 33.5,37 36.5,32 35.5,26 C 34.5,23.5 31.5,21.5 22.5,21.5 C 13.5,21.5 10.5,23.5 9.5,26 C 8.5,32 11.5,37 11.5,37" />
          </g>
          <path
            d="M 11.5,30 C 17,27 28,27 33.5,30 M 11.5,33.5 C 17,30.5 28,30.5 33.5,33.5 M 11.5,37 C 17,34 28,34 33.5,37"
            fill="none"
            stroke={detail}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return null;
  }
}
