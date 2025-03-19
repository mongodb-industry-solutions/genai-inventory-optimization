import styles from "./sidebar.module.css";
import { useState } from "react";
import Toggle from "@leafygreen-ui/toggle";
import Button from "@leafygreen-ui/button";
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";
import { Menu, MenuItem } from "@leafygreen-ui/menu";
import { Subtitle, Body } from "@leafygreen-ui/typography";
import CriteriaGenerator from "@/components/criteriaGenerator/CriteriaGenerator";

export default function Sidebar({
  criteria,
  setCriteria,
  availableCriteria,
  setAvailableCriteria,
}) {
  const [isModalOpen, setModalOpen] = useState(false);
  const protectedFields = [
    "annualDollarUsage",
    "averageUnitCost",
    "totalAnnualUsage",
    "leadTime",
  ];

  const handleCriteriaToggle = (criterion) => {
    if (criteria.includes(criterion)) {
      // Prevent removing the last remaining criterion
      if (criteria.length > 1) {
        setCriteria(criteria.filter((c) => c !== criterion));
      }
    } else {
      setCriteria([...criteria, criterion]);
    }
  };

  const handleDeleteField = async (field) => {
    try {
      const res = await fetch("/api/action/updateMany", {
        method: "POST",
        body: JSON.stringify({
          collection: "dataset",
          filter: {}, // Apply to all documents
          update: { $unset: { [field]: "" } },
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setAvailableCriteria(availableCriteria.filter((c) => c !== field));
        setCriteria(criteria.filter((c) => c !== field));
      } else {
        console.error("Failed to remove field:", field);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.criteriaContainer}>
        <Subtitle darkMode={true}>Select Criteria</Subtitle>
        <div className={styles.criteriaList}>
          {availableCriteria.map((c) => (
            <div key={c} className={styles.criteriaItem}>
              <Body
                weight={"medium"}
                darkMode={true}
                className={styles.criteriaName}
              >
                {c}
              </Body>
              {!protectedFields.includes(c) && (
                <Menu
                  trigger={
                    <IconButton aria-label={`Remove ${c}`} darkMode={true}>
                      <Icon glyph="VerticalEllipsis" />
                    </IconButton>
                  }
                >
                  <MenuItem
                    glyph={<Icon glyph="Trash" />}
                    variant={"destructive"}
                    onClick={() => handleDeleteField(c)}
                  >
                    Delete
                  </MenuItem>
                </Menu>
              )}
              <Toggle
                checked={criteria.includes(c)}
                onChange={() => handleCriteriaToggle(c)}
                aria-label={`Toggle ${c}`}
                size={"small"}
                disabled={criteria.length === 1 && criteria.includes(c)}
                darkMode={true}
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        className={styles.generateButton}
        darkMode={true}
        onClick={() => setModalOpen(true)}
      >
        Generate Criteria
      </Button>

      {isModalOpen && (
        <CriteriaGenerator
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          setAvailableCriteria={setAvailableCriteria}
        />
      )}
    </div>
  );
}
