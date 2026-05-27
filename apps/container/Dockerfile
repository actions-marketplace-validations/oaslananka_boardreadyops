FROM ubuntu:24.04@sha256:c4a8d5503dfb2a3eb8ab5f807da5bc69a85730fb49b5cfca2330194ebcc41c7b

ARG NODE_VERSION=22.22.3
ARG BOARDREADYOPS_VERSION=latest
ARG KICAD_PPA_SERIES=10.0

LABEL org.opencontainers.image.source="https://github.com/oaslananka/boardreadyops"
LABEL org.opencontainers.image.description="BoardReadyOps with KiCad CLI preinstalled."

RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
      ca-certificates \
      curl \
      gnupg \
      software-properties-common \
      xz-utils; \
    add-apt-repository --yes "ppa:kicad/kicad-${KICAD_PPA_SERIES}-releases"; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends kicad; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    case "$(dpkg --print-architecture)" in \
      amd64) node_arch="x64" ;; \
      arm64) node_arch="arm64" ;; \
      *) echo "Unsupported Node architecture." >&2; exit 1 ;; \
    esac; \
    archive="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/${archive}"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " ${archive}\$" SHASUMS256.txt | sha256sum -c -; \
    tar -xJf "${archive}" --directory /usr/local --strip-components 1; \
    rm "${archive}" SHASUMS256.txt; \
    node --version; \
    npm --version

RUN set -eux; \
    NPM_CONFIG_UPDATE_NOTIFIER=false npm install --global --no-audit --no-fund "boardreadyops@${BOARDREADYOPS_VERSION}"; \
    rm -rf /root/.npm /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx; \
    boardreadyops --version; \
    kicad-cli version; \
    mkdir -p /usr/share/doc/boardreadyops; \
    cp /usr/share/common-licenses/GPL-3 /usr/share/doc/boardreadyops/LICENSE-KICAD; \
    useradd --create-home --shell /bin/bash --uid 10001 boardreadyops

COPY action-entrypoint.sh /usr/local/bin/boardreadyops-action

RUN chmod 0755 /usr/local/bin/boardreadyops-action

ENTRYPOINT ["boardreadyops"]
