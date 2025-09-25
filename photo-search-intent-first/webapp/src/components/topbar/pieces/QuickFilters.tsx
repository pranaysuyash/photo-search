import type React from "react";

import { appendTokenToQuery } from "../utils/queryTokens";
import { Chip } from "../primitives/Chip";
import type { TopBarProps } from "../../TopBar";

type QuickFiltersProps = {
  disabled: boolean;
  meta?: TopBarProps["meta"];
  allTags: string[];
  clusters: Array<{ name?: string }>;
  searchText: string;
  setSearchText: (value: string) => void;
  doSearch: (value: string) => void | Promise<void>;
};

export const QuickFilters: React.FC<QuickFiltersProps> = ({
  disabled,
  meta,
  allTags,
  clusters,
  searchText,
  setSearchText,
  doSearch,
}) => {
  if (disabled) return null;

  const handleToken = (token: string) => () => {
    const next = appendTokenToQuery(searchText, token);
    setSearchText(next);
    void doSearch(next);
  };

  return (
    <div className="quick-filters hidden md:flex items-center gap-2 ml-2">
      {(meta?.cameras || []).slice(0, 3).map((camera) => (
        <Chip
          key={`cam-${camera}`}
          title={`Filter camera: ${camera}`}
          onClick={handleToken(`camera:"${camera}"`)}
          aria-label={`Filter results by camera ${String(camera)}`}
        >
          {String(camera)}
        </Chip>
      ))}
      {(allTags || []).slice(0, 6).map((tag) => (
        <Chip
          key={`tag-${tag}`}
          title={`Filter tag: ${tag}`}
          onClick={handleToken(`tag:${tag}`)}
          aria-label={`Filter results by tag ${String(tag)}`}
        >
          {String(tag)}
        </Chip>
      ))}
      {(clusters || [])
        .filter((cluster) => cluster.name)
        .slice(0, 6)
        .map((cluster) => (
          <Chip
            key={`person-${cluster.name}`}
            title={`Filter person: ${String(cluster.name)}`}
            onClick={handleToken(`person:"${String(cluster.name)}"`)}
          >
            {String(cluster.name)}
          </Chip>
        ))}
      <Chip title="Filter photos that contain text" onClick={handleToken(`has_text:true`)}>
        Text
      </Chip>
      <Chip
        title="Find videos longer than 30 seconds"
        onClick={handleToken(
          `(filetype:mp4 OR filetype:mov OR filetype:webm OR filetype:mkv OR filetype:avi) AND duration:>30`,
        )}
      >
        Videos &gt; 30s
      </Chip>
    </div>
  );
};

export default QuickFilters;
