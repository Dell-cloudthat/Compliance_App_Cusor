from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="consent-platform",
    version="1.0.0",
    author="Consent Platform",
    author_email="support@consent-platform.com",
    description="Python SDK for Consent as a Service Platform",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/consent-platform",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Internet :: WWW/HTTP",
        "Topic :: Security",
    ],
    python_requires=">=3.8",
    install_requires=[
        "httpx>=0.25.0",
        "pydantic>=2.0.0",
        "PyJWT>=2.8.0",
        "cryptography>=41.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
        ],
    },
)
