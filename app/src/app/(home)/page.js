"use client";

import { useState, useEffect } from "react";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import { H1 } from "@leafygreen-ui/typography";
import { MongoDBLogo } from "@leafygreen-ui/logo";
import Table from "@/components/table/Table";
import Sidebar from "@/components/sidebar/Sidebar";
import styles from "./page.module.css";
import InfoWizard from "@/components/infoWizard/InfoWizard";
import { TALK_TRACK } from "@/lib/const";

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [criteria, setCriteria] = useState(["annualDollarUsage"]);
  const [availableCriteria, setAvailableCriteria] = useState([]);
  const [openHelpModal, setOpenHelpModal] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/action/find", {
        method: "POST",
        body: JSON.stringify({ collection: "dataset", filter: {} }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data.length > 0 && availableCriteria.length === 0) {
        const fieldNames = Object.keys(data[0]).filter(
          (field) => field !== "_id" && field !== "productId"
        );

        setAvailableCriteria(fieldNames);
      }

      setProducts(data);
    }
    fetchData();
  }, [availableCriteria]);

  return (
    <div className={styles.pageContainer}>
      <LeafyGreenProvider>
        <Sidebar
          criteria={criteria}
          setCriteria={setCriteria}
          availableCriteria={availableCriteria}
          setAvailableCriteria={setAvailableCriteria}
        />
        <div className={styles.mainContent}>
          <MongoDBLogo />
          <H1 className={styles.title}>Inventory Optimization</H1>
          <InfoWizard
            open={openHelpModal}
            setOpen={setOpenHelpModal}
            tooltipText="Tell me more!"
            iconGlyph="Wizard"
            sections={TALK_TRACK}
          />
          <Table
            products={products}
            criteria={criteria}
            setCriteria={setCriteria}
          />
        </div>
      </LeafyGreenProvider>
    </div>
  );
}
