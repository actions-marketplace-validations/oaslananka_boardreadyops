class Boardreadyops < Formula
  desc "CI preflight for production-ready PCBs"
  homepage "https://github.com/oaslananka/boardreadyops"
  version "1.2.0"
  license "MIT"

  # Release v1.2.0 checksums from SHA256SUMS.
  # Regenerate with: gh release download boardreadyopsv#{version} && sha256sum boardreadyops-* > SHA256SUMS
  on_macos do
    on_arm do
      url "https://github.com/oaslananka/boardreadyops/releases/download/boardreadyopsv#{version}/boardreadyops-macos-arm64"
      sha256 "0a9666cb4684659efd384f6c7fe9df65832f56450b409f0f1c82125e2ce6c298"
    end

    on_intel do
      url "https://github.com/oaslananka/boardreadyops/releases/download/boardreadyopsv#{version}/boardreadyops-macos-x64"
      sha256 "ac2f22fd576f20adb561cc313f7d3a77777a9ed4529d84b9ceeb4a3153719621"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/oaslananka/boardreadyops/releases/download/boardreadyopsv#{version}/boardreadyops-linux-arm64"
      sha256 "022b3577ae3799669a00af919a4189c0f6ea3de75538eae00c9f27299257de40"
    end

    on_intel do
      url "https://github.com/oaslananka/boardreadyops/releases/download/boardreadyopsv#{version}/boardreadyops-linux-x64"
      sha256 "29ec5b1f06455423132be085b0c8bd3198f149e836afc66c20313e42ca2c1767"
    end
  end

  def install
    bin.install Dir["boardreadyops-*"].first => "boardreadyops"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/boardreadyops --version")
  end
end
