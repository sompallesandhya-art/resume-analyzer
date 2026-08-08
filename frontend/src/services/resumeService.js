import apiClient from './apiClient';

/**
 * Uploads a resume PDF for analysis.
 * @param {File} file - The resume PDF file.
 * @returns {Promise<Object>} Analysis result from the backend.
 */
export const analyzeResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/resume/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Compares a resume PDF against a job description.
 * @param {File} file - The resume PDF file.
 * @param {string} jobDescription - The job description text.
 * @returns {Promise<Object>} Match result from the backend.
 */
export const matchResumeWithJD = async (file, jobDescription) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('job_description', jobDescription);

  const response = await apiClient.post('/resume/match-jd', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Generates an AI-improved rewrite of the resume, optionally tailored to a job description.
 * @param {File} file - The resume PDF file.
 * @param {string} [jobDescription] - Optional job description to tailor the rewrite.
 * @returns {Promise<Object>} Rewrite result from the backend.
 */
export const rewriteResume = async (file, jobDescription) => {
  const formData = new FormData();
  formData.append('file', file);
  if (jobDescription && jobDescription.trim().length > 0) {
    formData.append('job_description', jobDescription);
  }

  const response = await apiClient.post('/resume/rewrite', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Generates a tailored cover letter from a resume and a job description.
 * @param {File} file - The resume PDF file.
 * @param {string} jobDescription - The job description text (required).
 * @returns {Promise<Object>} Structured cover letter result from the backend.
 */
export const generateCoverLetter = async (file, jobDescription) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('job_description', jobDescription);

  const response = await apiClient.post('/resume/cover-letter', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};
