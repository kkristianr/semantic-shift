import { useState } from "react";

const HomePage = () => {
  const [openSection, setOpenSection] = useState<string | null>("idea");

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="w-full p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Discovering semantic evolution and/or differences in diachronic and
          synchronic data
        </h2>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-4">
        {/* The Idea Section */}
        <div className="">
          <button
            onClick={() => toggleSection("idea")}
            className="w-full px-6 py-4 text-left flex items-center border-b border-gray-100"
          >
            <span className="text-gray-500 text-xl font-semibold mr-1">
              {openSection === "idea" ? "-" : "+"}
            </span>
            <h2 className="text-xl font-semibold text-gray-900">The idea</h2>
          </button>

          {openSection === "idea" && (
            <div className="px-6 pb-6">
              <div className="pt-4 text-gray-700 leading-relaxed">
                <p>
                  The idea behind word embeddings comes from the distributional
                  hypothesis: words that appear in similar contexts have similar
                  meanings. Since embeddings will reflect their training data,
                  and the data is usually not perfect, they will inherit its
                  biases. In this project, we want to use that bias to our
                  advantage by analyzing how the meaning of a word shifts across
                  space (e.g., publisher, genre) or time (e.g., year, decade).
                  For each setting, we train embeddings from scratch on the
                  given data. Since word embeddings from different corpora can't
                  be simply compared, we align them into a common vector space
                  to allow some analysis.
                </p>
                <p></p>
              </div>
            </div>
          )}
        </div>

        {/* The Details Section */}
        <div>
          <button
            onClick={() => toggleSection("details")}
            className="w-full px-6 py-4 text-left flex items-center"
          >
            <span className="text-gray-500 text-xl font-semibold mr-1">
              {openSection === "details" ? "−" : "+"}
            </span>
            <h2 className="text-xl font-semibold text-gray-900">How to?</h2>
          </button>

          {openSection === "details" && (
            <div className="px-6 pb-6 border-t border-gray-100">
              <div className="pt-4 text-gray-700 leading-relaxed">
                <p className="mb-4">
                  The system currently supports only one session at a time. If you want to test the tool, try to create a new session. If the system is occupied, please try again later. Since I am personally hosting and covering the server costs, I can’t allow multiple users to upload large data or train models from scratch at the same time.
                </p>
                <p className="mb-2">
                  Once you are able to create a session (valid for 30 minutes), follow these steps:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Upload your data in the{" "}
                    <a href="/upload" className="text-blue-600 hover:underline">
                      Data upload
                    </a>{" "}
                    section following the instructions.
                  </li>
                  <li>
                    Define your topics of interest in the{" "}
                    <a href="/terms" className="text-blue-600 hover:underline">
                      Terms of Interest
                    </a>{" "}
                    section. Define at least one main topic and associate some words with it. For example, if you have some corpora grouped by time indexes, you can define the topic <b>"sustainability"</b> and associate words like "renewable energy", "sustainable development", "light", "transport". Another example: define <b>"musk"</b> as a topic and associate "twitter", "tesla", "politician", "entrepreneur". You can define as many topics as you want following this pattern.
                  </li>
                  <li>
                    Define the training settings and the alignment method in the{" "}
                    <a href="/shifts" className="text-blue-600 hover:underline">
                      Shift Analysis
                    </a>{" "}
                    section.
                  </li>
                  <li>
                    Wait for the training to finish, grab a coffee in the meantime. Once the training & alignment are finished, line charts will be shown for each topic you defined. Each line in the chart corresponds to a related term, and the value corresponds to the cosine similarity. You can visually see how the meaning shifted based on the related terms.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
