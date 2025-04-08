import { useState, useEffect, useMemo, Fragment } from "react";
import Button from "@leafygreen-ui/button";
import {
  Table,
  TableHead,
  TableBody,
  HeaderRow,
  HeaderCell,
  Row,
  Cell,
  useLeafyGreenTable,
} from "@leafygreen-ui/table";
import { Body } from "@leafygreen-ui/typography";
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";
import { NumberInput } from "@leafygreen-ui/number-input";
import { TableSkeleton } from "@leafygreen-ui/skeleton-loader";
import Tooltip from "@leafygreen-ui/tooltip";
import Badge from "@leafygreen-ui/badge";
import Code from "@leafygreen-ui/code";
import styles from "./table.module.css";
import {
  normalizeData,
  calculateWeightedScores,
  calculateABC,
  compareResults,
} from "@/lib/analysis";

export default function DataTable({ products, criteria }) {
  const [weights, setWeights] = useState({});
  const [data, setData] = useState([]);
  const [results, setResults] = useState({});
  const [previousResults, setPreviousResults] = useState({});
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: "productId",
    direction: "asc",
  });

  useEffect(() => {
    setData(products);
    const defaultWeights = Object.fromEntries(
      criteria.map((c) => [c, 1 / criteria.length])
    );
    setWeights(defaultWeights);
  }, [products, criteria]);

  useEffect(() => {
    if (data.length === 0 || criteria.length === 0) return;
    const normalizedData = normalizeData(data, criteria);
    const updatedData = calculateWeightedScores(
      data,
      normalizedData,
      weights,
      criteria
    );
    setData(updatedData);
  }, [weights, criteria]);

  useEffect(() => {
    setData((prevData) => sortData(prevData, results, sortConfig));
  }, [sortConfig]);

  const handleWeightChange = (criteriaName, newWeight) => {
    setWeights((prev) => ({
      ...prev,
      [criteriaName]: parseFloat(newWeight) || 0,
    }));
  };

  const resetWeights = () => {
    const defaultWeights = Object.fromEntries(
      criteria.map((c) => [c, 1 / criteria.length])
    );
    setWeights(defaultWeights);
  };

  const runAnalysis = () => {
    const currentResults = calculateABC(data);
    const comparison = compareResults(previousResults, currentResults);
    setPreviousResults(currentResults);

    const updatedResults = Object.fromEntries(
      Object.entries(currentResults).map(([productId, currentClass]) => [
        productId,
        { currentClass, comparison: comparison[productId] },
      ])
    );

    setResults(updatedResults);

    // 🔹 Ensure the table updates
    setData((prevData) =>
      prevData.map((item) => ({
        ...item,
        class: updatedResults[item.productId]?.currentClass || "-",
      }))
    );
  };

  const sortData = (data, results, config) => {
    return [...data].sort((a, b) => {
      const { key, direction } = config;
      let aValue =
        key === "class"
          ? results[a.productId]?.currentClass || ""
          : a[key] || "";
      let bValue =
        key === "class"
          ? results[b.productId]?.currentClass || ""
          : b[key] || "";

      return aValue < bValue
        ? direction === "asc"
          ? -1
          : 1
        : aValue > bValue
        ? direction === "asc"
          ? 1
          : -1
        : 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleRow = (rowId) => {
    setExpandedRow(expandedRow === rowId ? null : rowId);
  };

  const columns = useMemo(
    () => [
      {
        id: "productId",
        accessorKey: "productId",
        header: "Product Code",
        enableSorting: false,
      },
      ...criteria.map((c) => ({
        id: c,
        accessorKey: c,
        header: c,
        enableSorting: false,
      })),
      {
        id: "weightedScore",
        accessorKey: "weightedScore",
        header: "Weighted Score",
        enableSorting: true,
      },
      {
        id: "class",
        accessorKey: "class",
        header: "Class",
        enableSorting: true,
      },
    ],
    [criteria]
  );

  const table = useLeafyGreenTable({
    data,
    columns,
  });

  const renderCellContent = (cell, productId) => {
    const cellValue = cell.getValue();
    const columnId = cell.column.id;
    const result = results[productId];

    if (columnId === "class") {
      return (
        <>
          <Badge
            variant={
              result?.currentClass === "A"
                ? "green"
                : result?.currentClass === "B"
                ? "yellow"
                : result?.currentClass === "C"
                ? "red"
                : "lightgray"
            }
          >
            {result?.currentClass || "-"}
          </Badge>
          {result?.comparison && (
            <span className={`${styles.arrow} ${styles[result.comparison]}`}>
              {result.comparison === "up" ? (
                <Icon glyph="CaretUp" fill="green" />
              ) : result.comparison === "down" ? (
                <Icon glyph="CaretDown" fill="red" />
              ) : (
                <></>
              )}
            </span>
          )}
        </>
      );
    }

    if (columnId === "weightedScore" || criteria.includes(columnId)) {
      return <Body>{parseFloat(cellValue).toFixed(2)}</Body>;
    }

    if (columnId === "productId") {
      return (
        <span style={{ display: "flex", alignItems: "center" }}>
          <IconButton aria-label="Expand row">
            <Icon
              glyph={
                expandedRow === cell.row.id ? "ChevronDown" : "ChevronRight"
              }
            />
          </IconButton>
          <Body>{cellValue.slice(0, 6).toUpperCase()}</Body>
        </span>
      );
    }

    return <Body>{cellValue}</Body>;
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableContainer}>
        {data.length === 0 ? (
          <TableSkeleton
            columnLabels={[
              "Product ID",
              ...criteria,
              "Weighted Score",
              "Class",
            ]}
            numRows={15}
          />
        ) : (
          <Table
            table={table}
            shouldAlternateRowColor={false}
            className={styles.table}
          >
            <TableHead isSticky>
              <HeaderRow>
                <HeaderCell>
                  <Body weight="medium">Weights</Body>
                  <Tooltip
                    trigger={
                      <IconButton
                        aria-label="Refresh weights"
                        onClick={resetWeights}
                      >
                        <Icon glyph="Revert" />
                      </IconButton>
                    }
                  >
                    Reset the weights to default values
                  </Tooltip>
                </HeaderCell>
                {criteria.map((c) => (
                  <HeaderCell key={c}>
                    <NumberInput
                      value={weights[c] || 0}
                      onChange={(e) => handleWeightChange(c, e.target.value)}
                      size={"small"}
                      inputClassName={styles.weightInput}
                      aria-label={"Criteia weight"}
                      step={".1"}
                    />
                  </HeaderCell>
                ))}
                <HeaderCell></HeaderCell>
                <HeaderCell></HeaderCell>
              </HeaderRow>
              <HeaderRow>
                {table.getHeaderGroups().map((headerGroup) =>
                  headerGroup.headers.map((header) => (
                    <HeaderCell
                      key={header.id}
                      header={header}
                      onClick={() => handleSort(header.id)}
                    >
                      <Body weight="medium">
                        {header.column.columnDef.header}
                      </Body>
                    </HeaderCell>
                  ))
                )}
              </HeaderRow>
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <Fragment key={row.id}>
                  <Row key={row.id} row={row} onClick={() => toggleRow(row.id)}>
                    {row.getVisibleCells().map((cell) => (
                      <Cell key={cell.id} className={styles.centeredCell}>
                        {renderCellContent(cell, row.original.productId)}
                      </Cell>
                    ))}
                  </Row>
                  {expandedRow === row.id && (
                    <Row>
                      <Cell
                        colSpan={columns.length}
                        style={{ justifyItems: "center" }}
                      >
                        <div
                          style={{
                            padding: "12px 70px 24px 70px",
                          }}
                        >
                          <Code
                            language="json"
                            style={{ width: "100%", display: "inline-block" }}
                          >
                            {JSON.stringify(row.original, null, 2)}
                          </Code>
                        </div>
                      </Cell>
                    </Row>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <div className={styles.buttonWrapper}>
        <Button onClick={runAnalysis} variant="primary">
          Run Analysis
        </Button>
      </div>
    </div>
  );
}
