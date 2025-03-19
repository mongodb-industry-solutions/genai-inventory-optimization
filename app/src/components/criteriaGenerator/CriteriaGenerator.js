"use client";

import { useState, useEffect } from "react";
import { Subtitle } from "@leafygreen-ui/typography";
import dynamic from "next/dynamic";
import Modal from "@leafygreen-ui/modal";
import TextArea from "@leafygreen-ui/text-area";
import TextInput from "@leafygreen-ui/text-input";
import { Select, Option } from "@leafygreen-ui/select";
import { Chip } from "@leafygreen-ui/chip";
import Button from "@leafygreen-ui/button";
import styles from "./criteriaGenerator.module.css";

const Spinner = dynamic(
  () => import("@leafygreen-ui/loading-indicator").then((mod) => mod.Spinner),
  { ssr: false }
);

const PageLoader = dynamic(
  () =>
    import("@leafygreen-ui/loading-indicator").then((mod) => mod.PageLoader),
  { ssr: false }
);

export default function CriteriaGenerator({
  isOpen,
  onClose,
  setAvailableCriteria,
}) {
  const [prompt, setPrompt] = useState("");
  const [criteriaName, setCriteriaName] = useState("");
  const [criteriaDefinition, setCriteriaDefinition] = useState("");
  const [dataSources, setDataSources] = useState([]); // Selected sources
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingDots, setLoadingDots] = useState("");
  const [availableSources] = useState([
    "Sales",
    "Inventory",
    "Reviews",
    "Products",
  ]); // Example sources

  useEffect(() => {
    if (loading) {
      let dotCount = 0;
      const interval = setInterval(() => {
        dotCount = (dotCount + 1) % 4; // Cycles from 0 to 3
        setLoadingDots(".".repeat(dotCount));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setLoadingDots("");
    }
  }, [loading]);

  const handleAutofill = async () => {
    setLoading(true);
    setCriteriaName("");
    setCriteriaDefinition("");
    try {
      const response = await fetch("/api/bedrock/defineCriteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error("Failed to fetch generated criteria");

      const data = await response.json();
      setCriteriaName(data.criteriaName);
      setCriteriaDefinition(data.criteriaDefinition);
      setDataSources(data.dataSources);
    } catch (error) {
      console.error("Autofill Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCriteria = async () => {
    setIsGenerating(true);
    const criteriaField = criteriaName
      .replace(/\s+/g, "")
      .replace(/^\w/, (c) => c.toLowerCase());

    try {
      const response = await fetch("/api/bedrock/assignScores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteriaField,
          criteriaDefinition,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate criteria");
      setAvailableCriteria((prev) => [...prev, criteriaField]);
      onClose();
    } catch (error) {
      console.error("Error generating criteria:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveSource = (source) => {
    setDataSources((prev) => prev.filter((item) => item !== source));
  };

  const handleAddSource = (value) => {
    if (!dataSources.includes(value)) {
      setDataSources((prev) => [...prev, value]);
    }
  };

  const isGenerateDisabled =
    !criteriaName.trim() ||
    !criteriaDefinition.trim() ||
    dataSources.length === 0;

  return (
    <Modal
      open={isOpen}
      setOpen={onClose}
      label="Criteria Generator"
      className={styles.modal}
      contentClassName={`${styles.modalContent} ${
        isGenerating ? styles.modalCenteredContent : ""
      }`}
    >
      {isGenerating ? (
        <PageLoader description="Doing science..." />
      ) : (
        <div className={styles.modalContent}>
          <Subtitle>GenAI-Powered Criteria Generator</Subtitle>
          <TextArea
            label="Describe your criteria"
            placeholder="Explain what kind of criteria you need..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button
            onClick={handleAutofill}
            disabled={prompt.trim() === ""}
            isLoading={loading}
            loadingText="Filling descriptions…"
            loadingIndicator={<Spinner />}
          >
            Autofill
          </Button>

          <TextInput
            label="Criteria Name"
            value={loading ? loadingDots : criteriaName}
            onChange={(e) => setCriteriaName(e.target.value)}
            disabled={loading}
            sizeVariant={"default"}
            className={styles.criteriaName}
          />

          <TextArea
            label="Criteria Definition"
            value={loading ? loadingDots : criteriaDefinition}
            onChange={(e) => setCriteriaDefinition(e.target.value)}
            disabled={loading}
            id={styles.criteriaDefinition}
          />

          <Select
            label="Data Sources"
            value=""
            onChange={(value) => handleAddSource(value)}
            disabled={loading}
          >
            {availableSources.map((source) => (
              <Option key={source} value={source}>
                {source}
              </Option>
            ))}
          </Select>

          {/* Display Selected Sources */}
          <div className={styles.selectedSources}>
            {dataSources.map((source, index) => (
              <Chip
                key={index}
                label={source.toUpperCase()}
                onDismiss={() => handleRemoveSource(source)}
                variant={"gray"}
              />
            ))}
          </div>

          <Button
            onClick={handleGenerateCriteria}
            disabled={isGenerateDisabled}
            variant={"baseGreen"}
          >
            Generate
          </Button>
        </div>
      )}
    </Modal>
  );
}
